// State Management
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdate = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const lastSyncTime = document.getElementById('last-sync-time');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const updatesContainer = document.getElementById('updates-container');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const emptyResults = document.getElementById('empty-results');
const retryBtn = document.getElementById('retry-btn');

// Selection Bar
const selectionBar = document.getElementById('selection-bar');
const selectionCount = document.getElementById('selection-count');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const tweetSelectionBtn = document.getElementById('tweet-selection-btn');

// Tweet Modal
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');

// Fetch and initialize on load
document.addEventListener('DOMContentLoaded', () => {
  fetchReleaseNotes();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  refreshBtn.addEventListener('click', fetchReleaseNotes);
  retryBtn.addEventListener('click', fetchReleaseNotes);
  
  // Search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.toLowerCase();
      applyFiltersAndSearch();
    }, 250);
  });

  // Filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      applyFiltersAndSearch();
    });
  });

  // Selection Actions
  clearSelectionBtn.addEventListener('click', clearSelection);
  tweetSelectionBtn.addEventListener('click', openTweetModalForSelected);

  // Modal Actions
  closeModalBtn.addEventListener('click', closeTweetModal);
  cancelTweetBtn.addEventListener('click', closeTweetModal);
  submitTweetBtn.addEventListener('click', executeTweet);

  tweetTextarea.addEventListener('input', () => {
    updateCharCounter();
  });
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
  showLoading(true);
  showError(false);
  showEmpty(false);
  clearSelection();

  try {
    const response = await fetch('/api/release-notes');
    const data = await response.json();

    if (data.success && data.entries) {
      processEntries(data.entries);
      updateLastSyncTime();
    } else {
      throw new Error(data.error || 'Failed to fetch release notes');
    }
  } catch (error) {
    console.error('Error fetching release notes:', error);
    showError(true);
  } finally {
    showLoading(false);
  }
}

// Process raw XML entry content into granular feature updates
function processEntries(entries) {
  allUpdates = [];

  entries.forEach((entry, entryIdx) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.content, 'text/html');
    
    // Group content by heading elements
    const children = Array.from(doc.body.children);
    let currentType = 'Feature'; // Fallback type
    let currentHtmlParts = [];
    let currentTextParts = [];

    // Simple helper to push update item
    const pushCurrentUpdate = () => {
      if (currentHtmlParts.length > 0) {
        const htmlContent = currentHtmlParts.join('');
        const textContent = currentTextParts.join(' ').replace(/\s+/g, ' ').trim();
        
        allUpdates.push({
          id: `${entry.id || 'entry_' + entryIdx}_${allUpdates.length}`,
          date: entry.title,
          type: formatBadgeName(currentType),
          rawType: currentType,
          html: htmlContent,
          text: textContent,
          link: entry.link
        });
      }
    };

    children.forEach(child => {
      const tagName = child.tagName.toUpperCase();
      if (tagName === 'H3' || tagName === 'H4' || tagName === 'H2') {
        // Push previous section before starting new one
        pushCurrentUpdate();
        
        currentType = child.textContent.trim();
        currentHtmlParts = [];
        currentTextParts = [];
      } else {
        currentHtmlParts.push(child.outerHTML);
        currentTextParts.push(child.textContent);
      }
    });

    // Push the final remaining section
    pushCurrentUpdate();
  });

  applyFiltersAndSearch();
}

function formatBadgeName(type) {
  const t = type.toLowerCase();
  if (t.includes('feature')) return 'Feature';
  if (t.includes('deprecation')) return 'Deprecation';
  if (t.includes('notice')) return 'Notice';
  if (t.includes('preview')) return 'Preview';
  return type; // Keep original if it's custom
}

// Apply searches and filter updates
function applyFiltersAndSearch() {
  filteredUpdates = allUpdates.filter(update => {
    // Filter match
    let matchesFilter = true;
    if (currentFilter !== 'all') {
      matchesFilter = update.type === currentFilter || update.rawType.toLowerCase().includes(currentFilter.toLowerCase());
    }

    // Search query match
    let matchesSearch = true;
    if (searchQuery) {
      matchesSearch = update.text.toLowerCase().includes(searchQuery) ||
                      update.date.toLowerCase().includes(searchQuery) ||
                      update.type.toLowerCase().includes(searchQuery);
    }

    return matchesFilter && matchesSearch;
  });

  renderCards();
}

// Render cards into UI
function renderCards() {
  updatesContainer.innerHTML = '';

  if (filteredUpdates.length === 0) {
    showEmpty(true);
    return;
  }

  showEmpty(false);

  filteredUpdates.forEach(update => {
    const card = document.createElement('article');
    card.className = `update-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
    card.id = `card-${update.id}`;
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-selected', selectedUpdate && selectedUpdate.id === update.id ? 'true' : 'false');
    
    // Badge class determination
    let badgeClass = 'badge-general';
    if (update.type === 'Feature') badgeClass = 'badge-feature';
    else if (update.type === 'Deprecation') badgeClass = 'badge-deprecation';
    else if (update.type === 'Notice') badgeClass = 'badge-notice';

    card.innerHTML = `
      <div class="select-indicator"><i class="fa-solid fa-check"></i></div>
      <div class="card-top">
        <div class="card-meta">
          <span class="card-date">${update.date}</span>
          <span class="badge ${badgeClass}">${update.type}</span>
        </div>
        <div class="card-actions">
          <button class="card-action-btn tweet-btn" title="Tweet this update" aria-label="Tweet this update">
            <i class="fa-brands fa-x-twitter"></i>
          </button>
        </div>
      </div>
      <div class="card-body">
        ${update.html}
      </div>
    `;

    // Click on card to select
    card.addEventListener('click', (e) => {
      // If clicking inside the tweet button, open compose modal directly and don't toggle general card selection
      if (e.target.closest('.tweet-btn')) {
        e.stopPropagation();
        openTweetModalForUpdate(update);
        return;
      }
      toggleCardSelection(update);
    });

    // Keyboard support for accessibility
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCardSelection(update);
      }
    });

    updatesContainer.appendChild(card);
  });
}

// Toggle selection state
function toggleCardSelection(update) {
  if (selectedUpdate && selectedUpdate.id === update.id) {
    clearSelection();
  } else {
    // Select new
    if (selectedUpdate) {
      const prevSelectedCard = document.getElementById(`card-${selectedUpdate.id}`);
      if (prevSelectedCard) {
        prevSelectedCard.classList.remove('selected');
        prevSelectedCard.setAttribute('aria-selected', 'false');
      }
    }
    
    selectedUpdate = update;
    const card = document.getElementById(`card-${update.id}`);
    if (card) {
      card.classList.add('selected');
      card.setAttribute('aria-selected', 'true');
    }
    
    showSelectionBar(true);
  }
}

function clearSelection() {
  if (selectedUpdate) {
    const card = document.getElementById(`card-${selectedUpdate.id}`);
    if (card) {
      card.classList.remove('selected');
      card.setAttribute('aria-selected', 'false');
    }
  }
  selectedUpdate = null;
  showSelectionBar(false);
}

function showSelectionBar(show) {
  if (show && selectedUpdate) {
    selectionCount.textContent = `1 update selected (${selectedUpdate.date} - ${selectedUpdate.type})`;
    selectionBar.classList.add('visible');
  } else {
    selectionBar.classList.remove('visible');
  }
}

// Helper to prefill and compose tweet
function generateTweetText(update) {
  const prefix = `🚀 BigQuery Update (${update.date}) [${update.type}]: `;
  const linkText = `\nOriginal Notes: ${update.link}`;
  
  // Calculate max text length available for the content body
  // 280 (Twitter Limit) - prefix length - link length
  const maxBodyLength = 280 - prefix.length - linkText.length - 4; // 4 extra chars for safety + ellipsis
  
  let cleanBody = update.text;
  if (cleanBody.length > maxBodyLength) {
    cleanBody = cleanBody.substring(0, maxBodyLength).trim() + '...';
  }
  
  return `${prefix}${cleanBody}${linkText}`;
}

// Open tweet modal
function openTweetModalForUpdate(update) {
  const tweetText = generateTweetText(update);
  tweetTextarea.value = tweetText;
  updateCharCounter();
  
  tweetModal.classList.add('visible');
  tweetTextarea.focus();
}

function openTweetModalForSelected() {
  if (selectedUpdate) {
    openTweetModalForUpdate(selectedUpdate);
  }
}

function closeTweetModal() {
  tweetModal.classList.remove('visible');
}

function updateCharCounter() {
  const charsUsed = tweetTextarea.value.length;
  const charsRemaining = 280 - charsUsed;
  charCounter.textContent = `${charsRemaining} characters remaining`;
  
  if (charsRemaining < 0) {
    charCounter.style.color = '#ef4444';
    submitTweetBtn.disabled = true;
  } else {
    charCounter.style.color = '#9ca3af';
    submitTweetBtn.disabled = false;
  }
}

function executeTweet() {
  const text = tweetTextarea.value;
  if (text.length > 0 && text.length <= 280) {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
  }
}

// UI State Helpers
function showLoading(show) {
  if (show) {
    loadingSpinner.classList.remove('hidden');
    refreshIcon.classList.add('spin');
    refreshBtn.disabled = true;
  } else {
    loadingSpinner.classList.add('hidden');
    refreshIcon.classList.remove('spin');
    refreshBtn.disabled = false;
  }
}

function showError(show) {
  if (show) {
    errorMessage.classList.remove('hidden');
    updatesContainer.classList.add('hidden');
  } else {
    errorMessage.classList.add('hidden');
    updatesContainer.classList.remove('hidden');
  }
}

function showEmpty(show) {
  if (show) {
    emptyResults.classList.remove('hidden');
  } else {
    emptyResults.classList.add('hidden');
  }
}

function updateLastSyncTime() {
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  lastSyncTime.textContent = `Last synced: ${now.toLocaleTimeString(undefined, options)}`;
}
