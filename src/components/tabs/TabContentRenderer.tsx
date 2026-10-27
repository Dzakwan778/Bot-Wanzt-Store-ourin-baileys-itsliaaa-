import React from 'react';
import { TabStoreInfo } from './TabStoreInfo';
import { TabCommand } from './TabCommand';
import { TabProduk } from './TabProduk';
import { TabSsm } from './TabSsm';
import { TabTopUp } from './TabTopUp';
import { TabConnection } from './TabConnection';
import { TabGrup } from './TabGrup';
import { TabTransaksi } from './TabTransaksi';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useXavieraData } from '../../hooks/useXavieraData';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useButtonModal } from '../../hooks/useButtonModal';
import { useBotConnection } from '../../hooks/useBotConnection';
import { useTransactions } from '../../hooks/useTransactions';

interface TabContentRendererProps {
  selectedTab: string;
  storeConfig: ReturnType<typeof useStoreConfig>;
  xaviera: ReturnType<typeof useXavieraData>;
  groupsData: ReturnType<typeof useWhatsAppGroups>;
  buttonModal: ReturnType<typeof useButtonModal>;
  botConn: ReturnType<typeof useBotConnection>;
  transactionsState: ReturnType<typeof useTransactions>;
  showToast: (msg: string) => void;
}

export const TabContentRenderer: React.FC<TabContentRendererProps> = ({
  selectedTab,
  storeConfig,
  xaviera,
  groupsData,
  buttonModal,
  botConn,
  transactionsState,
  showToast,
}) => {
  if (selectedTab === 'Store Info') {
    return (
      <TabStoreInfo
        storeInfo={storeConfig.storeInfo}
        setStoreInfo={storeConfig.setStoreInfo}
        isSavingConfig={storeConfig.isSavingConfig}
        onSave={() => storeConfig.syncConfigToServer({ storeInfo: storeConfig.storeInfo })}
        showToast={showToast}
      />
    );
  }

  if (selectedTab === 'Command') {
    return (
      <TabCommand
        selectedCommand={storeConfig.selectedCommand}
        setSelectedCommand={storeConfig.setSelectedCommand}
        menuOutputText={storeConfig.menuOutputText}
        setMenuOutputText={storeConfig.setMenuOutputText}
        menuFooterText={storeConfig.menuFooterText}
        setMenuFooterText={storeConfig.setMenuFooterText}
        includeMedia={storeConfig.includeMedia}
        setIncludeMedia={storeConfig.setIncludeMedia}
        selectedPicture={storeConfig.selectedPicture}
        setSelectedPicture={storeConfig.setSelectedPicture}
        availablePictures={storeConfig.availablePictures}
        setAvailablePictures={storeConfig.setAvailablePictures}
        menuButtons={storeConfig.menuButtons}
        onOpenAddButtonModal={buttonModal.handleOpenAddButtonModal}
        onEditButton={buttonModal.handleEditButton}
        onDeleteButton={buttonModal.handleDeleteButton}
        onSaveMenu={() =>
          storeConfig.syncConfigToServer(
            storeConfig.menuOutputText,
            storeConfig.menuButtons,
            storeConfig.listOutputText,
            storeConfig.includeMedia,
            storeConfig.selectedPicture
          )
        }
        listOutputText={storeConfig.listOutputText}
        setListOutputText={storeConfig.setListOutputText}
        listFooterText={storeConfig.listFooterText}
        setListFooterText={storeConfig.setListFooterText}
        onSaveList={() =>
          storeConfig.syncConfigToServer(
            storeConfig.menuOutputText,
            storeConfig.menuButtons,
            storeConfig.listOutputText,
            storeConfig.includeMedia,
            storeConfig.selectedPicture,
            xaviera.xavieraApiKey,
            xaviera.xavieraBaseUrl,
            storeConfig.carouselOutputText,
            storeConfig.carouselPicture,
            storeConfig.storeInfo,
            storeConfig.menuFooterText,
            storeConfig.listFooterText
          )
        }
        carouselOutputText={storeConfig.carouselOutputText}
        setCarouselOutputText={storeConfig.setCarouselOutputText}
        carouselFooterText={storeConfig.carouselFooterText}
        setCarouselFooterText={storeConfig.setCarouselFooterText}
        carouselPicture={storeConfig.carouselPicture}
        setCarouselPicture={storeConfig.setCarouselPicture}
        onSaveCarousel={() =>
          storeConfig.syncConfigToServer(
            storeConfig.menuOutputText,
            storeConfig.menuButtons,
            storeConfig.listOutputText,
            storeConfig.includeMedia,
            storeConfig.selectedPicture,
            xaviera.xavieraApiKey,
            xaviera.xavieraBaseUrl,
            storeConfig.carouselOutputText,
            storeConfig.carouselPicture,
            storeConfig.storeInfo,
            storeConfig.menuFooterText,
            storeConfig.listFooterText,
            storeConfig.carouselFooterText
          )
        }
        storeInfo={storeConfig.storeInfo}
        isSavingConfig={storeConfig.isSavingConfig}
        showToast={showToast}
      />
    );
  }

  if (selectedTab === 'Produk') {
    return (
      <TabProduk
        productsList={xaviera.productsList}
        loadingProducts={xaviera.loadingProducts}
        productSearch={xaviera.productSearch}
        setProductSearch={xaviera.setProductSearch}
        selectedProductCategory={xaviera.selectedProductCategory}
        setSelectedProductCategory={xaviera.setSelectedProductCategory}
        onRefreshProducts={xaviera.fetchXavieraProducts}
        showToast={showToast}
      />
    );
  }

  if (selectedTab === 'SMM' || selectedTab === 'SSM' || selectedTab === 'tab02') {
    return (
      <TabSsm
        smmList={xaviera.smmList}
        smmSearch={xaviera.smmSearch}
        setSmmSearch={xaviera.setSmmSearch}
        smmPage={xaviera.smmPage}
        setSmmPage={xaviera.setSmmPage}
        smmItemsPerPage={xaviera.smmItemsPerPage}
        setSmmItemsPerPage={xaviera.setSmmItemsPerPage}
        selectedSmmCategory={xaviera.selectedSmmCategory}
        setSelectedSmmCategory={xaviera.setSelectedSmmCategory}
        loadingSmm={xaviera.loadingSmm}
        fetchXavieraSmm={xaviera.fetchXavieraSmm}
        showToast={showToast}
      />
    );
  }

  if (selectedTab === 'Top Up' || selectedTab === 'tab03') {
    return (
      <TabTopUp
        topUpList={xaviera.topUpList}
        topUpSearch={xaviera.topUpSearch}
        setTopUpSearch={xaviera.setTopUpSearch}
        topUpPage={xaviera.topUpPage}
        setTopUpPage={xaviera.setTopUpPage}
        topUpItemsPerPage={xaviera.topUpItemsPerPage}
        setTopUpItemsPerPage={xaviera.setTopUpItemsPerPage}
        selectedTopUpCategory={xaviera.selectedTopUpCategory}
        setSelectedTopUpCategory={xaviera.setSelectedTopUpCategory}
        loadingTopUp={xaviera.loadingTopUp}
        fetchXavieraGames={xaviera.fetchXavieraGames}
        showToast={showToast}
      />
    );
  }

  if (selectedTab === 'Connection' || selectedTab === 'tab06') {
    return (
      <TabConnection
        xavieraApiKey={xaviera.xavieraApiKey}
        setXavieraApiKey={xaviera.setXavieraApiKey}
        xavieraBaseUrl={xaviera.xavieraBaseUrl}
        setXavieraBaseUrl={xaviera.setXavieraBaseUrl}
        lunasQrisApiKey={storeConfig.lunasQrisApiKey}
        setLunasQrisApiKey={storeConfig.setLunasQrisApiKey}
        lunasQrisSecretKey={storeConfig.lunasQrisSecretKey}
        setLunasQrisSecretKey={storeConfig.setLunasQrisSecretKey}
        lunasQrisBaseUrl={storeConfig.lunasQrisBaseUrl}
        setLunasQrisBaseUrl={storeConfig.setLunasQrisBaseUrl}
        showApiKey={xaviera.showApiKey}
        setShowApiKey={xaviera.setShowApiKey}
        isSavingConfig={storeConfig.isSavingConfig}
        syncConfigToServer={storeConfig.syncConfigToServer}
        menuOutputText={storeConfig.menuOutputText}
        menuButtons={storeConfig.menuButtons}
        listOutputText={storeConfig.listOutputText}
        includeMedia={storeConfig.includeMedia}
        selectedPicture={storeConfig.selectedPicture}
        showToast={showToast}
      />
    );
  }

  if (selectedTab === 'Grup' || selectedTab === 'tab04') {
    return (
      <TabGrup
        groups={groupsData.groups}
        groupSearchQuery={groupsData.groupSearchQuery}
        setGroupSearchQuery={groupsData.setGroupSearchQuery}
        isLoadingGroups={groupsData.isLoadingGroups}
        groupsError={groupsData.groupsError}
        togglingGroupId={groupsData.togglingGroupId}
        copiedGroupId={groupsData.copiedGroupId}
        fetchGroups={groupsData.fetchGroups}
        handleToggleGroup={groupsData.handleToggleGroup}
        copyGroupIdToClipboard={groupsData.copyGroupIdToClipboard}
        botStatus={botConn.botData.status}
      />
    );
  }

  if (selectedTab === 'Transaksi' || selectedTab === 'tab05') {
    return (
      <TabTransaksi
        transactionsState={transactionsState}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="py-8 px-4 text-center space-y-2">
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 mx-auto flex items-center justify-center font-mono font-bold text-xs">
        {selectedTab}
      </div>
      <h4 className="text-sm font-semibold text-slate-800">
        Tab: {selectedTab}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
        Slot tab ini telah disiapkan untuk penambahan modul atau fitur berikutnya.
      </p>
    </div>
  );
};
