"use client";

import { useMedia } from "@/hooks/useMedia";
import { Header } from "./components/Header/Header";
import { SidePanel } from "./components/SidePanel/SidePanel";
import { Workspace } from "./components/Workspace/Workspace";
import { MobileMenu } from "./components/MobileMenu/MobileMenu";
import { Modal } from "./components/Modal/Modal";
import { Settings } from "./components/Settings/Settings";

export default function Home() {
  const {
    filteredItems,
    isLoading,
    searchQuery,
    activeFilter,
    selectedItem,
    showSettings,
    showMobileMenu,
    showBlur,
    tags,
    collections,
    selectedFilenames,
    handleUpload,
    handleDelete,
    handleFilterChange,
    handleSearch,
    handleItemClick,
    toggleSelection,
    clearSelection,
    handleBatchDelete,
    handleBatchCollection,
    handleBatchTags,
    setShowMobileMenu,
    setShowSettings,
    setShowBlur,
    setSelectedItem,
    addNewTag,
    deleteTag,
    updateTag,
    addNewCollection,
    deleteCollection,
    handleReorderTags,
    handleReorderCollections,
    addTagToItem,
    removeTagFromItem,
    addToCollection,
    removeFromCollection,
    saveSettings,
  } = useMedia();

  return (
    <div className="flex flex-col md:grid md:grid-cols-[120px_1fr] h-screen">
      <div className="hidden md:flex">
        <SidePanel
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          collections={collections}
        />
      </div>
      <div className="flex flex-col h-full overflow-hidden z-0">
        <div className="md:hidden flex items-center justify-between px-2 py-2 bg-surface border-b border-border relative z-40">
          <span className="text-base font-bold text-rose">HDATA</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-muted"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-muted"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.804 2.885 2.165a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.804 3.31-2.165 2.885a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.804-2.885-2.165a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.804-3.31 2.165-2.885a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <MobileMenu
            collections={collections}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            onClose={() => setShowMobileMenu(false)}
          />
        )}

        <Header onUpload={handleUpload} onSearch={handleSearch} tags={tags} />

        <Workspace
          items={filteredItems}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onItemClick={handleItemClick}
          showBlur={showBlur}
          tags={tags}
          selectedFilenames={selectedFilenames}
          onToggleSelection={toggleSelection}
          onClearSelection={clearSelection}
          onBatchDelete={handleBatchDelete}
          onBatchCollection={handleBatchCollection}
          onBatchTags={handleBatchTags}
          collections={collections}
        />
      </div>

      {selectedItem && (
        <Modal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          tags={tags}
          onAddTag={addTagToItem}
          onRemoveTag={removeTagFromItem}
          collections={collections}
          onAddToCollection={addToCollection}
          onRemoveFromCollection={removeFromCollection}
        />
      )}

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        showBlur={showBlur}
        onBlurChange={setShowBlur}
        tags={tags}
        onAddTag={addNewTag}
        onDeleteTag={deleteTag}
        onUpdateTag={updateTag}
        onSaveSettings={saveSettings}
        collections={collections}
        onAddCollection={addNewCollection}
        onDeleteCollection={deleteCollection}
        onReorderTags={handleReorderTags}
        onReorderCollections={handleReorderCollections}
      />
    </div>
  );
}
