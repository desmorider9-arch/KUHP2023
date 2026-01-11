// app.js

// Global State
let allData = []; // Will reference kuhpData
let displayedData = [];
let currentLimit = 20;
const LIMIT_INCREMENT = 20;

// DOM Elements
const contentArea = document.getElementById('content-area');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const babListEl = document.getElementById('bab-list');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof kuhpData !== 'undefined') {
        allData = kuhpData;
        displayedData = allData;
        initSidebar();
        renderInitialList();
        setupEventListeners();
    } else {
        contentArea.innerHTML = '<div class="loading-spinner">Gagal memuat data. Pastikan data.js tersedia.</div>';
    }
});

function setupEventListeners() {
    // Infinite Scroll
    contentArea.addEventListener('scroll', () => {
        if (contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 100) {
            loadMore();
        }
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        performSearch(query);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        performSearch('');
    });

    // Sidebar
    menuBtn.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
}

// Rendering
function renderInitialList() {
    currentLimit = 20;
    contentArea.innerHTML = ''; // Clear
    renderChunk(0, currentLimit);
}

function loadMore() {
    if (currentLimit >= displayedData.length) return;
    const nextLimit = currentLimit + LIMIT_INCREMENT;
    renderChunk(currentLimit, nextLimit);
    currentLimit = nextLimit;
}

function renderChunk(start, end) {
    const chunk = displayedData.slice(start, end);
    const fragment = document.createDocumentFragment();

    let lastBab = (start > 0) ? displayedData[start - 1].bab : null;

    chunk.forEach(item => {
        // Check for BAB change to insert separator
        if (item.bab !== lastBab) {
            const sep = document.createElement('div');
            sep.className = 'bab-separator';
            sep.innerHTML = `<h3>${item.bab || 'Pendahuluan'}</h3>`;
            fragment.appendChild(sep);
            lastBab = item.bab;
        }

        const card = document.createElement('article');
        card.className = 'pasal-card';
        card.id = `pasal-${item.pasal}`;

        // Highlight logic if search is active
        let contentHtml = escapeHtml(item.content);
        const query = searchInput.value.trim();
        if (query && query.length > 1) {
            contentHtml = highlightText(contentHtml, query);
        }

        // Add Section/Paragraf context small
        let contextInfo = [];
        if (item.bagian) contextInfo.push(item.bagian.replace('Bagian ', 'Bg. '));
        if (item.paragraf) contextInfo.push(item.paragraf);
        const metaText = contextInfo.join(' • ');

        card.innerHTML = `
            <div class="pasal-header">
                <span class="pasal-number">Pasal ${item.pasal}</span>
                <span class="pasal-meta">${metaText}</span>
            </div>
            <div class="pasal-content">${contentHtml}</div>
        `;
        fragment.appendChild(card);
    });

    contentArea.appendChild(fragment);
}

// Search Logic
function performSearch(query) {
    query = query.toLowerCase().trim();
    if (!query) {
        displayedData = allData;
        renderInitialList();
        return;
    }

    // specific number search
    if (/^\d+$/.test(query)) {
        // Prioritize exact pasal match
        const exactMatch = allData.filter(item => item.pasal == query);
        const otherMatches = allData.filter(item => item.pasal != query && (item.pasal.includes(query) || item.content.toLowerCase().includes(query)));
        displayedData = [...exactMatch, ...otherMatches];
    } else {
        displayedData = allData.filter(item => {
            return item.pasal.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query) ||
                (item.bab && item.bab.toLowerCase().includes(query));
        });
    }

    // Reset view
    currentLimit = 20;
    contentArea.innerHTML = '';

    if (displayedData.length === 0) {
        contentArea.innerHTML = '<div class="loading-spinner">Tidak ditemukan.</div>';
    } else {
        renderChunk(0, currentLimit);
    }
}

// Sidebar Logic
function initSidebar() {
    // Extract unique BABS
    const babs = [];
    const seen = new Set();

    // Find index of first item of each BAB
    allData.forEach((item, index) => {
        if (item.bab && !seen.has(item.bab)) {
            seen.add(item.bab);
            babs.push({
                title: item.bab,
                firstPasal: item.pasal,
                index: index // We can use this to slice or scroll
            });
        }
    });

    babListEl.innerHTML = babs.map(b => `
        <div class="bab-item" onclick="scrollToPasal('${b.firstPasal}')">
            <h4>${b.title}</h4>
            <p>Mulai Pasal ${b.firstPasal}</p>
        </div>
    `).join('');
}

function scrollToPasal(pasalNum) {
    closeSidebar();
    // Clear search
    if (searchInput.value) {
        searchInput.value = '';
        performSearch('');
    }

    // Check if element exists in DOM (it might not if not rendered yet)
    // We need to find the index of this pasal in allData, calculate render position?
    // Easiest way: Set displayedData to start from this BAB? 
    // Or just "jump" by rendering from that point?

    // Let's find index in allData
    const idx = allData.findIndex(item => item.pasal == pasalNum);
    if (idx !== -1) {
        // We want to render starting from this index, or valid chunk
        // Reset list and set start? 
        // Simpler: Just render list properly and scroll.
        // If index is 500, we need to ensure it is in DOM.
        // Logic: Reload list with currentLimit covering this index
        if (idx >= currentLimit) {
            currentLimit = idx + 20; // Load up to this point + buffer
            contentArea.innerHTML = '';
            renderChunk(0, currentLimit);
        }

        setTimeout(() => {
            const el = document.getElementById(`pasal-${pasalNum}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
}

// Utils
function openSidebar() {
    sidebar.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('hidden');
    overlay.classList.add('hidden');
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function highlightText(html, query) {
    const re = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return html.replace(re, '<span class="highlight">$1</span>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Expose to window for onclick
window.scrollToPasal = scrollToPasal;
window.performSearch = performSearch;

console.log("App Initialized");
