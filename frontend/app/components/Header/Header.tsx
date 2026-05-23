"use client";

import { useState, useRef } from "react";
import type { Tag, SearchOptions } from "@/types";

interface HeaderProps {
  onUpload: (file: File) => void;
  onSearch: (options: SearchOptions) => void;
  tags: Tag[];
}

export const Header = ({ onUpload, onSearch, tags }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<'AND' | 'OR'>('AND');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        onUpload(file);
      }
      e.target.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const lastAtPos = value.lastIndexOf("@");
    if (lastAtPos !== -1) {
      const afterAt = value.slice(lastAtPos + 1);
      if (!afterAt.includes(" ")) {
        setTagSearch(afterAt);
        setShowTagMenu(true);
      } else {
        setShowTagMenu(false);
      }
    } else {
      setShowTagMenu(false);
      setTagSearch("");
    }
  };

  const handleSelectTag = (tagName: string) => {
    const tagToAdd = tagName === 'NoTags' ? '@NoTags' : tagName === 'NoCollection' ? '@NoCollection' : tagName;
    if (!selectedTags.includes(tagToAdd)) {
      const newTags = [...selectedTags, tagToAdd];
      setSelectedTags(newTags);
      applySearch(searchQuery, newTags);
      
      const lastAtPos = searchQuery.lastIndexOf("@");
      const newQuery = searchQuery.slice(0, lastAtPos).trim();
      setSearchQuery(newQuery);
    }
    setShowTagMenu(false);
    setTagSearch("");
    inputRef.current?.focus();
  };

  const handleAddNoTags = () => {
    if (!selectedTags.includes('@NoTags')) {
      const newTags = [...selectedTags, '@NoTags'];
      setSelectedTags(newTags);
      applySearch(searchQuery, newTags);
      
      const lastAtPos = searchQuery.lastIndexOf("@");
      const newQuery = searchQuery.slice(0, lastAtPos).trim();
      setSearchQuery(newQuery);
    }
    setShowTagMenu(false);
    setTagSearch("");
    inputRef.current?.focus();
  };

  const handleAddNoCollection = () => {
    if (!selectedTags.includes('@NoCollection')) {
      const newTags = [...selectedTags, '@NoCollection'];
      setSelectedTags(newTags);
      applySearch(searchQuery, newTags);
      
      const lastAtPos = searchQuery.lastIndexOf("@");
      const newQuery = searchQuery.slice(0, lastAtPos).trim();
      setSearchQuery(newQuery);
    }
    setShowTagMenu(false);
    setTagSearch("");
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagName: string) => {
    const newTags = selectedTags.filter((t) => t !== tagName);
    setSelectedTags(newTags);
    applySearch(searchQuery, newTags);
  };

  const handleExcludeTag = (tagName: string) => {
    const tagToExclude = tagName === 'NoTags' ? '@NoTags' : tagName === 'NoCollection' ? '@NoCollection' : tagName;
    if (!excludedTags.includes(tagToExclude)) {
      const newExcluded = [...excludedTags, tagToExclude];
      setExcludedTags(newExcluded);
      applySearch(searchQuery, selectedTags, newExcluded);

      const lastAtPos = searchQuery.lastIndexOf("@");
      const newQuery = searchQuery.slice(0, lastAtPos).trim();
      setSearchQuery(newQuery);
    }
    setShowTagMenu(false);
    setTagSearch("");
    inputRef.current?.focus();
  };

  const handleRemoveExcludedTag = (tagName: string) => {
    const newExcluded = excludedTags.filter((t) => t !== tagName);
    setExcludedTags(newExcluded);
    applySearch(searchQuery, selectedTags, newExcluded);
  };

  const applySearch = (query: string, tagsList: string[], excludeList?: string[]) => {
    onSearch({
      query,
      tags: tagsList,
      excludeTags: excludeList ?? excludedTags,
      tagMode,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sizeMin: sizeMin ? parseInt(sizeMin) * 1024 * 1024 : undefined,
      sizeMax: sizeMax ? parseInt(sizeMax) * 1024 * 1024 : undefined,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(searchQuery, selectedTags);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setExcludedTags([]);
    setTagMode('AND');
    setDateFrom("");
    setDateTo("");
    setSizeMin("");
    setSizeMax("");
    onSearch({ query: "", tags: [], excludeTags: [], tagMode: 'AND' });
  };

  const hasActiveFilters = selectedTags.length > 0 || excludedTags.length > 0 || dateFrom || dateTo || sizeMin || sizeMax;

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div className="h-auto px-2 sm:px-6 py-2 sm:py-3 glass-dark border-b border-border z-[100] relative">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 order-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-rose to-mauve rounded-lg flex items-center justify-center accent-glow">
            <span className="text-sm sm:text-lg">⌘</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-rose tracking-wider hidden md:block">
            HDATA_VAULT
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="w-full max-w-md relative z-[50] order-3 sm:order-none">
          <div className="flex items-center gap-2 flex-wrap min-h-[40px]">
            {selectedTags.map((tag) => {
              const tagData = tags.find((t) => t.name === tag || t.name === tag.replace('@', ''));
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
                  style={{ backgroundColor: tag === '@NoTags' || tag === '@NoCollection' ? '#888888' : (tagData?.color || '#888'), color: "white" }}
                >
                  @{tag.replace('@', '')}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-white/20 rounded p-0.5"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {excludedTags.map((tag) => {
              const tagData = tags.find((t) => t.name === tag || t.name === tag.replace('@', ''));
              const bgColor = tag === '@NoTags' || tag === '@NoCollection' ? '#888888' : (tagData?.color || '#888');
              return (
                <span
                  key={`ex-${tag}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono line-through opacity-70"
                  style={{ backgroundColor: bgColor, color: "white" }}
                >
                  -@{tag.replace('@', '')}
                  <button
                    type="button"
                    onClick={() => handleRemoveExcludedTag(tag)}
                    className="hover:bg-white/20 rounded p-0.5"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <input
              ref={inputRef}
              type="text"
              placeholder={selectedTags.length === 0 ? "Search... (@tag)" : ""}
              value={searchQuery}
              onChange={handleInputChange}
              className="flex-1 min-w-[100px] sm:min-w-[150px] h-9 px-3 rounded-lg bg-surface border border-border focus:border-rose focus:ring-1 focus:ring-rose/30 transition-all outline-none text-text placeholder-dim font-mono text-sm"
            />
            <button 
              type="submit"
              onTouchEnd={(e) => { e.preventDefault(); applySearch(searchQuery, selectedTags); }}
              className="sm:hidden w-9 h-9 bg-rose rounded-md flex items-center justify-center text-dark touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          </div>
          
          <button 
              type="submit" 
              onTouchEnd={(e) => { e.preventDefault(); applySearch(searchQuery, selectedTags); }}
              className="hidden sm:absolute sm:inline-flex right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-card hover:bg-rose/20 rounded-md items-center justify-center text-rose transition-colors"
            >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>

          {(showTagMenu || tagSearch.toLowerCase() === 'notags' || tagSearch.toLowerCase() === 'nocollection') && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-lg shadow-xl overflow-hidden z-[200] max-h-48 overflow-y-auto border border-border">
              {!selectedTags.includes('@NoTags') && (
                <button
                  type="button"
                  onClick={handleAddNoTags}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-card text-left transition-colors border-b border-border cursor-pointer touch-manipulation"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#888888]" />
                  <span className="text-text font-mono text-sm">@NoTags</span>
                  <span className="text-dim text-xs font-mono">- no tags</span>
                </button>
              )}
              {!selectedTags.includes('@NoCollection') && (
                <button
                  type="button"
                  onClick={handleAddNoCollection}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-card text-left transition-colors border-b border-border cursor-pointer touch-manipulation"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#888888]" />
                  <span className="text-text font-mono text-sm">@NoCollection</span>
                  <span className="text-dim text-xs font-mono">- no collection</span>
                </button>
              )}
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center hover:bg-card transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTag(tag.name)}
                    className="flex-1 px-4 py-3 flex items-center gap-2 text-left cursor-pointer touch-manipulation"
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-text font-mono text-sm">{tag.name}</span>
                    <span className="text-dim text-xs font-mono">({tag.count})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcludeTag(tag.name)}
                    className="px-3 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-mono text-sm cursor-pointer touch-manipulation"
                    title="Exclude tag"
                  >
                    ⊖
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 flex-shrink-0 order-2 sm:order-none">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`h-9 px-2 sm:px-3 border rounded-lg font-mono text-xs sm:text-sm transition-all flex items-center gap-1 sm:gap-2 ${showOptions || hasActiveFilters ? 'bg-rose/20 border-rose text-rose' : 'bg-surface border-border text-muted hover:border-rose/50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
            <span className="hidden xs:inline">FILTERS</span>
            {hasActiveFilters && <span className="w-2 h-2 bg-rose rounded-full"></span>}
          </button>

          <button
            onClick={handleButtonClick}
            className="h-9 px-3 sm:px-4 bg-rose/10 hover:bg-rose/20 border border-rose text-rose font-mono text-xs sm:text-sm font-medium rounded-lg transition-all hover:shadow-[0_0_15px_rgba(241, 91, 181, 0.3)] flex items-center gap-1 sm:gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            <span className="hidden xs:inline">UP</span>
          </button>
        </div>
      </div>

      {showOptions && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 items-end">
          <div className="min-w-[120px]">
            <label className="text-dim text-xs font-mono mb-1 block">TAG MODE</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { setTagMode('AND'); applySearch(searchQuery, selectedTags); }}
                className={`flex-1 py-1 px-2 rounded text-xs font-mono ${tagMode === 'AND' ? 'bg-rose text-dark' : 'bg-surface text-muted'}`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => { setTagMode('OR'); applySearch(searchQuery, selectedTags); }}
                className={`flex-1 py-1 px-2 rounded text-xs font-mono ${tagMode === 'OR' ? 'bg-rose text-dark' : 'bg-surface text-muted'}`}
              >
                OR
              </button>
            </div>
          </div>

          <div className="min-w-[140px]">
            <label className="text-dim text-xs font-mono mb-1 block">DATE FROM</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); applySearch(searchQuery, selectedTags); }}
              className="w-full h-9 px-2 rounded bg-surface border border-border text-text font-mono text-sm"
            />
          </div>

          <div className="min-w-[140px]">
            <label className="text-dim text-xs font-mono mb-1 block">DATE TO</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); applySearch(searchQuery, selectedTags); }}
              className="w-full h-9 px-2 rounded bg-surface border border-border text-text font-mono text-sm"
            />
          </div>

          <div className="min-w-[160px]">
            <label className="text-dim text-xs font-mono mb-1 block">SIZE (MB)</label>
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="min"
                value={sizeMin}
                onChange={(e) => { setSizeMin(e.target.value); applySearch(searchQuery, selectedTags); }}
                className="w-full h-9 px-2 rounded bg-surface border border-border text-text font-mono text-sm"
              />
              <input
                type="number"
                placeholder="max"
                value={sizeMax}
                onChange={(e) => { setSizeMax(e.target.value); applySearch(searchQuery, selectedTags); }}
                className="w-full h-9 px-2 rounded bg-surface border border-border text-text font-mono text-sm"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-mono text-sm hover:bg-red-500/30"
            >
              CLEAR ALL
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.json,.xml,.html,.css,.js,.ts"
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
    </div>
  );
};