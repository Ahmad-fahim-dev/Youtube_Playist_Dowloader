// ======================================
// YouTube Playlist Downloader - Interactive Features
// Backend Integration & Dynamic UI
// ======================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    createParticles();
    initScrollAnimations();
    initHamburgerMenu();
    initCursorEffects();
    initThemeToggle();
    initPlaylistDownloader();
    initScrollNavigation();
    initStickyNav();
    initContactForm();

    // ========== Background Particles ==========
    function createParticles() {
        const particles = document.getElementById('particles');
        if (!particles) return;

        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 25 + 's';
            particle.style.animationDuration = (20 + Math.random() * 15) + 's';

            const size = Math.random() * 6 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            if (Math.random() > 0.7) {
                particle.style.background = 'rgba(229, 9, 20, 0.8)';
                particle.style.boxShadow = '0 0 10px rgba(229, 9, 20, 0.8)';
            }

            particles.appendChild(particle);
        }
    }

    // ========== Scroll-Based Animations ==========
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements that should fade in on scroll
        document.querySelectorAll('.section-header, .feature-card, .step-card, .testimonial-card, .cta-content').forEach(el => {
            observer.observe(el);
        });
    }

    // ========== Hamburger Menu ==========
    function initHamburgerMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');

        if (!hamburger || !navLinks) return;

        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking on links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // ========== Custom Cursor Effects ==========
    function initCursorEffects() {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function updateCursor() {
            cursorX += (mouseX - cursorX) * 0.1;
            cursorY += (mouseY - cursorY) * 0.1;

            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';

            requestAnimationFrame(updateCursor);
        }
        updateCursor();
    }

    // ========== Theme Toggle ==========
    function initThemeToggle() {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (!themeToggleBtn) return;

        // Check for saved theme preference or default to light
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon(themeToggleBtn, currentTheme);

        themeToggleBtn.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(themeToggleBtn, newTheme);
            
            showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`, 'success');
        });
    }

    function updateThemeIcon(btn, theme) {
        const icon = btn.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    // ========== Playlist Downloader Form Handling ==========
    function initPlaylistDownloader() {
        const playlistURL = document.getElementById('playlist-url');
        const clearInput = document.getElementById('clear-input');
        const downloadFullBtn = document.getElementById('hero-cta-btn');
        const playlistSection = document.getElementById('playlist-preview');
        const videosContainer = document.getElementById('videos-container');
        const playlistTitle = document.getElementById('playlist-title');
        const totalVideosSpan = document.getElementById('total-videos');
        const qualitySelect = document.getElementById('quality-select');
        const formatSelect = document.getElementById('download-format');
        const downloadAllBtn = document.getElementById('download-all-videos');
        const browseLocationBtn = document.getElementById('browse-location-btn');
        const locationDisplay = document.getElementById('download-location-display');
        const locationPath = document.getElementById('location-path');
        const clearLocationBtn = document.getElementById('clear-location');
        
        // Store selected directory handle
        let selectedDirectory = null;

        if (!playlistURL || !downloadFullBtn) return;

        // Input interactions
        playlistURL.addEventListener('input', () => {
            clearInput.style.display = playlistURL.value ? 'block' : 'none';
        });

        clearInput.addEventListener('click', () => {
            playlistURL.value = '';
            clearInput.style.display = 'none';
            playlistURL.focus();
        });
        
        // Browse Location Button
        if (browseLocationBtn) {
            browseLocationBtn.addEventListener('click', async () => {
                try {
                    // Check if File System Access API is supported
                    if ('showDirectoryPicker' in window) {
                        const dirHandle = await window.showDirectoryPicker({
                            mode: 'readwrite'
                        });
                        selectedDirectory = dirHandle;
                        
                        // Display selected location
                        if (locationDisplay && locationPath) {
                            locationDisplay.style.display = 'flex';
                            locationPath.textContent = `Saving to: ${dirHandle.name}`;
                        }
                        
                        showToast(`Download location set to: ${dirHandle.name}`, 'success');
                    } else {
                        showToast('Your browser will ask where to save each file', 'warning');
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error selecting directory:', error);
                        showToast('Could not select directory', 'error');
                    }
                }
            });
        }
        
        // Clear Location Button
        if (clearLocationBtn) {
            clearLocationBtn.addEventListener('click', () => {
                selectedDirectory = null;
                if (locationDisplay) {
                    locationDisplay.style.display = 'none';
                }
                showToast('Download location cleared. Using browser default.', 'success');
            });
        }

        // Download Full Playlist (changed from two buttons to one)
        downloadFullBtn.addEventListener('click', () => handlePlaylistFetch(playlistURL.value.trim(), 'full'));

        // Handle Playlist Fetching
        async function handlePlaylistFetch(url, mode) {
            if (!url) {
                showToast('Please enter a YouTube playlist URL', 'error');
                playlistURL.focus();
                return;
            }

            if (!isValidYouTubeURL(url)) {
                showToast('Please enter a valid YouTube playlist URL', 'error');
                playlistURL.focus();
                return;
            }

            // Show loading state
            downloadFullBtn.disabled = true;
            downloadFullBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';

            try {
                // Fetch playlist from backend
                const response = await fetch('/fetch_playlist', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        playlist_url: url,
                        mode: mode 
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    showToast(`Found ${data.videos.length} videos in playlist!`, 'success');
                    displayPlaylist(data.playlist_title, data.videos, mode);
                } else {
                    showToast(data.message || 'Failed to fetch playlist', 'error');
                }
            } catch (error) {
                console.error('Error fetching playlist:', error);
                showToast('Network error. Please try again.', 'error');
            } finally {
                downloadFullBtn.disabled = false;
                downloadFullBtn.innerHTML = '<i class="fas fa-download"></i> Fetch Playlist';
            }
        }

        // Display Playlist Videos
        function displayPlaylist(title, videos, mode) {
            playlistSection.style.display = 'block';
            playlistTitle.textContent = title;
            totalVideosSpan.textContent = videos.length;
            videosContainer.innerHTML = '';

            videos.forEach((video, index) => {
                const videoCard = createVideoCard(video, index, mode);
                videosContainer.appendChild(videoCard);
            });

            // Scroll to playlist section
            playlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Download all button handler
            if (downloadAllBtn) {
                downloadAllBtn.onclick = () => downloadAllVideos(videos);
            }
        }

        // Create Video Card
        function createVideoCard(video, index, mode) {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <div class="video-thumbnail-wrapper">
                    <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                    <span class="video-duration">${video.duration || 'N/A'}</span>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-meta">
                        <span class="video-author"><i class="fas fa-user"></i> ${video.author || 'Unknown'}</span>
                    </div>
                    <div class="video-actions">
                        <button class="btn glow-btn" onclick="downloadVideo('${video.video_id}', ${index})">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                    <div class="video-progress" id="progress-${index}" style="display: none;">
                        <div class="video-progress-fill" id="progress-fill-${index}" style="width: 0%;"></div>
                    </div>
                    <div class="video-speed" id="speed-${index}" style="display: none;"></div>
                </div>
            `;
            return card;
        }

        // Download All Videos
        async function downloadAllVideos(videos) {
            const quality = qualitySelect.value;
            const format = formatSelect ? formatSelect.value : 'mp4';
            showToast(`Starting download of ${videos.length} videos in ${format.toUpperCase()} format...`, 'success');

            for (let i = 0; i < videos.length; i++) {
                await downloadVideo(videos[i].video_id, i, quality, format);
                await sleep(2000); // Delay between downloads
            }

            showToast('All downloads completed! Check your Downloads folder.', 'success');
        }

        // Make downloadVideo global for onclick handlers
        window.downloadVideo = async function(videoId, index, quality = null, format = null) {
            quality = quality || qualitySelect.value;
            format = format || (formatSelect ? formatSelect.value : 'mp4');
            const progressBar = document.getElementById(`progress-${index}`);
            const progressFill = document.getElementById(`progress-fill-${index}`);
            const speedEl = document.getElementById(`speed-${index}`);

            if (progressBar) progressBar.style.display = 'block';
            if (speedEl) speedEl.style.display = 'block';
            if (speedEl) speedEl.textContent = 'Starting download...';

            try {
                const response = await fetch('/download_video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        video_id: videoId,
                        quality: quality,
                        format: format
                    })
                });

                // Simulate progress
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 10;
                    if (progress >= 90) {
                        progress = 90;
                    }
                    if (progressFill) progressFill.style.width = progress + '%';
                    if (speedEl) speedEl.textContent = `Processing: ${progress.toFixed(0)}%`;
                }, 300);

                const data = await response.json();
                clearInterval(interval);

                if (data.status === 'success') {
                    if (progressFill) progressFill.style.width = '100%';
                    if (speedEl) speedEl.textContent = 'Downloading to your browser...';
                    
                    // Download file from server
                    if (data.download_url) {
                        try {
                            // Fetch the file from server
                            const response = await fetch(data.download_url);
                            const blob = await response.blob();
                            
                            // Use File System Access API if directory is selected
                            if (selectedDirectory && 'showDirectoryPicker' in window) {
                                try {
                                    // Create file in selected directory
                                    const fileHandle = await selectedDirectory.getFileHandle(
                                        data.filename || `video.${format}`,
                                        { create: true }
                                    );
                                    const writable = await fileHandle.createWritable();
                                    await writable.write(blob);
                                    await writable.close();
                                    
                                    if (speedEl) speedEl.textContent = `Saved to ${selectedDirectory.name}!`;
                                    showToast(`File saved to ${selectedDirectory.name}!`, 'success');
                                } catch (error) {
                                    console.error('Error writing file:', error);
                                    // Fallback to regular download
                                    downloadWithBrowser(data.download_url, data.filename, format);
                                    if (speedEl) speedEl.textContent = 'Downloaded! Check your Downloads folder.';
                                }
                            } else {
                                // Regular browser download
                                downloadWithBrowser(data.download_url, data.filename, format);
                                if (speedEl) speedEl.textContent = 'Downloaded! Check your Downloads folder.';
                            }
                        } catch (error) {
                            console.error('Download error:', error);
                            // Fallback
                            downloadWithBrowser(data.download_url, data.filename, format);
                        }
                    }
                } else {
                    if (progressFill) progressFill.style.width = '0%';
                    if (speedEl) speedEl.textContent = 'Download failed';
                    showToast(data.message || 'Download failed', 'error');
                }
            } catch (error) {
                console.error('Download error:', error);
                if (speedEl) speedEl.textContent = 'Error occurred';
                showToast('Download error. Please try again.', 'error');
            }
        };

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        // Helper function for regular browser download
        function downloadWithBrowser(url, filename, format) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `video.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // ========== Contact Form Handling ==========
    function initContactForm() {
        // Removed - contact form no longer exists
    }

    // ========== Sticky Navigation ==========
    function initStickyNav() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Active link on scroll
        const sections = document.querySelectorAll('section[id]');
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;

            sections.forEach(section => {
                const sectionHeight = section.offsetHeight;
                const sectionTop = section.offsetTop - 100;
                const sectionId = section.getAttribute('id');
                const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                    if (navLink) navLink.classList.add('active');
                }
            });
        });
    }

    // ========== Smooth Scroll Navigation ==========
    function initScrollNavigation() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ========== Toast Notifications ==========
    function showToast(message, type = 'success') {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <i class="toast-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            <span class="toast-message">${message}</span>
        `;

        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // ========== Email Validation ==========
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ========== YouTube URL Validation ==========
    function isValidYouTubeURL(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return youtubeRegex.test(url);
    }
});
