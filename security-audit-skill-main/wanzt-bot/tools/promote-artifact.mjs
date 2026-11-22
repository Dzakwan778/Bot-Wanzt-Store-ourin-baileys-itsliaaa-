import fs from 'node:fs';
import path from 'node:path';

const MAX_FILE_BYTES = 1024 * 1024; // 1 MiB

function assertSafeRelative(relPath) {
  if (!relPath || typeof relPath !== 'string') throw new Error('Empty path');
  if (path.isAbsolute(relPath) || relPath.includes('\\') || relPath.includes('\0')) {
    throw new Error(`Unsafe path: ${relPath}`);
  }
  const parts = relPath.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..')) {
    throw new Error(`Invalid relative segments: ${relPath}`);
  }
  return parts;
}

function promote(scratchRoot, artifactsRoot, relPath) {
  const parts = assertSafeRelative(relPath);
  const scratchDirFd = fs.openSync(scratchRoot, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  const artifactsDirFd = fs.openSync(artifactsRoot, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try {
    // Walk scratchRoot parents safely (check each component with lstat no-follow)
    let curSrc = scratchRoot;
    for (let i = 0; i < parts.length - 1; i++) {
      curSrc = path.join(curSrc, parts[i]);
      const st = fs.lstatSync(curSrc);
      if (st.isSymbolicLink() || !st.isDirectory()) {
        throw new Error(`Unsafe scratch dir component: ${curSrc}`);
      }
    }
    const srcLeafPath = path.join(curSrc, parts[parts.length - 1]);
    const srcFd = fs.openSync(
      srcLeafPath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK
    );
    try {
      const st1 = fs.fstatSync(srcFd);
      if (!st1.isFile() || st1.nlink !== 1 || st1.size > MAX_FILE_BYTES) {
        throw new Error(`Invalid scratch leaf stat: isFile=${st1.isFile()} nlink=${st1.nlink} size=${st1.size}`);
      }
      const buf = Buffer.allocUnsafe(st1.size);
      let off = 0;
      while (off < st1.size) {
        const n = fs.readSync(srcFd, buf, off, st1.size - off, null);
        if (n === 0) break;
        off += n;
      }
      if (off !== st1.size) throw new Error('Short read on scratch leaf');
      const st2 = fs.fstatSync(srcFd);
      if (st2.ino !== st1.ino || st2.dev !== st1.dev || st2.size !== st1.size || st2.nlink !== 1) {
        throw new Error('Scratch leaf changed during read');
      }

      // Walk/create artifactsRoot dirs safely
      let curDst = artifactsRoot;
      for (let i = 0; i < parts.length - 1; i++) {
        curDst = path.join(curDst, parts[i]);
        if (!fs.existsSync(curDst)) {
          fs.mkdirSync(curDst, { mode: 0o755 });
        }
        const stD = fs.lstatSync(curDst);
        if (stD.isSymbolicLink() || !stD.isDirectory()) {
          throw new Error(`Unsafe artifacts dir component: ${curDst}`);
        }
      }
      const dstLeafPath = path.join(curDst, parts[parts.length - 1]);
      if (fs.existsSync(dstLeafPath)) {
        fs.unlinkSync(dstLeafPath);
      }
      const dstFd = fs.openSync(
        dstLeafPath,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
        0o600
      );
      try {
        const dstSt = fs.fstatSync(dstFd);
        if (!dstSt.isFile() || dstSt.nlink !== 1) {
          throw new Error('Destination leaf is not exclusive regular file');
        }
        fs.writeSync(dstFd, buf, 0, buf.length, 0);
        fs.fsyncSync(dstFd);
      } finally {
        fs.closeSync(dstFd);
      }
      console.log(`PROMOTED: ${relPath} (${buf.length} bytes)`);
    } finally {
      fs.closeSync(srcFd);
    }
  } finally {
    fs.closeSync(scratchDirFd);
    fs.closeSync(artifactsDirFd);
  }
}

const [,, scratchRoot, artifactsRoot, relPath] = process.argv;
if (!scratchRoot || !artifactsRoot || !relPath) {
  console.error('Usage: node promote-artifact.mjs <scratchRoot> <artifactsRoot> <relPath>');
  process.exit(1);
}
promote(scratchRoot, artifactsRoot, relPath);
