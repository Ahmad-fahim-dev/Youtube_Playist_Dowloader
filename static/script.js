// ======================================
// YouTube Playlist Downloader - Interactive Features
// Backend Integration & Dynamic UI
// ======================================

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all features
    // Initialize core features
    initDownloadTabs();
    initSingleVideoDownload();
    initPlaylistDownloader();
    initScrollNavigation();
    initStickyNav();


    // ========== Download Tabs ==========
    function initDownloadTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');

                // Remove active class from all tabs and contents
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // ========== Single Video Download ==========
    // Global variable for single video download directory
    window.singleVideoDownloadDirectory = null;
    let currentVideoId = null;

    function initSingleVideoDownload() {
        const videoURL = document.getElementById('video-url');
        const clearVideoInput = document.getElementById('clear-video-input');
        const loadVideoBtn = document.getElementById('load-video-btn');
        const videoInfoSection = document.getElementById('video-info-section');
        const downloadVideoBtn = document.getElementById('download-video-btn');
        const qualitySelect = document.getElementById('single-quality-select');
        const formatSelect = document.getElementById('single-download-format');
        const progressContainer = document.getElementById('single-download-progress');
        const progressFill = document.getElementById('single-progress-fill');
        const progressPercent = document.getElementById('single-progress-percent');
        const speedDisplay = document.getElementById('single-speed');
        const etaDisplay = document.getElementById('single-eta');
        const elapsedDisplay = document.getElementById('single-elapsed');
        const downloadedDisplay = document.getElementById('single-downloaded');
        const downloadComplete = document.getElementById('single-download-complete');
        const browseSingleLocationBtn = document.getElementById('single-browse-location-btn');
        const singleLocationDisplay = document.getElementById('single-download-location-display');
        const singleLocationPath = document.getElementById('single-location-path');
        const clearSingleLocationBtn = document.getElementById('single-clear-location');

        if (!videoURL || !loadVideoBtn) return;

        // Input interactions
        videoURL.addEventListener('input', () => {
            clearVideoInput.style.display = videoURL.value ? 'block' : 'none';
        });

        clearVideoInput.addEventListener('click', () => {
            videoURL.value = '';
            clearVideoInput.style.display = 'none';
            videoURL.focus();
            // Reset UI
            videoInfoSection.style.display = 'none';
            progressContainer.style.display = 'none';
        });

        // STEP 1: Load Video Info
        loadVideoBtn.addEventListener('click', async () => {
            const url = videoURL.value.trim();

            if (!url) {
                showToast('Please enter a YouTube video URL', 'error');
                videoURL.focus();
                return;
            }

            if (!isValidYouTubeURL(url)) {
                showToast('Please enter a valid YouTube video URL', 'error');
                videoURL.focus();
                return;
            }

            // Show loading state
            loadVideoBtn.disabled = true;
            loadVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

            try {
                const response = await fetch('/fetch_video_info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ video_url: url })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // Store video ID
                    currentVideoId = data.video.video_id;

                    // Display video information
                    document.getElementById('video-thumbnail').src = data.video.thumbnail;
                    document.getElementById('video-title').textContent = data.video.title;
                    document.getElementById('video-duration').querySelector('span').textContent = data.video.duration;
                    document.getElementById('video-author').querySelector('span').textContent = data.video.author;

                    // Show video info section
                    videoInfoSection.style.display = 'block';
                    progressContainer.style.display = 'none';

                    showToast('Video loaded successfully!', 'success');

                    // Scroll to video info
                    videoInfoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    showToast(data.message || 'Failed to load video', 'error');
                }
            } catch (error) {
                console.error('Error loading video:', error);
                showToast('Failed to load video info. The server might be busy or the URL is invalid.', 'error');
            } finally {
                loadVideoBtn.disabled = false;
                loadVideoBtn.innerHTML = '<i class="fas fa-search"></i> Load Video';
            }
        });

        // STEP 2: Browse Location Button
        if (browseSingleLocationBtn) {
            browseSingleLocationBtn.addEventListener('click', async () => {
                try {
                    if ('showDirectoryPicker' in window) {
                        const dirHandle = await window.showDirectoryPicker({
                            mode: 'readwrite'
                        });
                        window.singleVideoDownloadDirectory = dirHandle;

                        if (singleLocationDisplay && singleLocationPath) {
                            singleLocationDisplay.style.display = 'flex';
                            singleLocationPath.textContent = `Saving to: ${dirHandle.name}`;
                        }

                        showToast(`Download location set to: ${dirHandle.name}`, 'success');
                    } else {
                        showToast('Your browser does not support folder selection. Files will be saved to Downloads folder.', 'warning');
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
        if (clearSingleLocationBtn) {
            clearSingleLocationBtn.addEventListener('click', () => {
                window.singleVideoDownloadDirectory = null;
                if (singleLocationDisplay) {
                    singleLocationDisplay.style.display = 'none';
                }
                showToast('Download location cleared. Using browser default.', 'success');
            });
        }

        // STEP 3: Start Download
        downloadVideoBtn.addEventListener('click', async () => {
            if (!currentVideoId) {
                showToast('Please load a video first', 'error');
                return;
            }

            const quality = qualitySelect.value;
            const format = formatSelect.value;

            // Show progress container
            progressContainer.style.display = 'block';
            downloadComplete.style.display = 'none';
            progressFill.style.width = '0%';
            progressPercent.textContent = '0%';
            speedDisplay.textContent = '0 MB/s';
            etaDisplay.textContent = 'Calculating...';
            elapsedDisplay.textContent = '0s';
            downloadedDisplay.textContent = '0 MB / 0 MB';

            // Disable download button
            downloadVideoBtn.disabled = true;
            downloadVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Download...';

            try {
                const response = await fetch('/download_single', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        video_url: `https://www.youtube.com/watch?v=${currentVideoId}`,
                        quality: quality,
                        format: format
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    showToast('Download started!', 'success');

                    // Start listening to progress updates via SSE
                    const videoId = data.video_id;
                    const eventSource = new EventSource(`/download_progress/${videoId}`);

                    eventSource.onmessage = function (event) {
                        const progress = JSON.parse(event.data);
                        console.log('Progress update:', progress);

                        if (progress.status === 'downloading' || progress.status === 'starting') {
                            // Update progress bar with real-time data
                            const percent = Math.round(progress.percent || 0);
                            progressFill.style.width = percent + '%';
                            progressPercent.textContent = percent + '%';

                            // Update speed - ensure it's displayed properly
                            const speed = progress.speed || '0 MB/s';
                            speedDisplay.textContent = speed;

                            // Update ETA - ensure it's displayed properly
                            const eta = progress.eta || 'Calculating...';
                            etaDisplay.textContent = eta;

                            // Update elapsed time
                            const elapsed = progress.elapsed || 0;
                            elapsedDisplay.textContent = formatElapsedTime(elapsed);

                            // Update downloaded size
                            const downloaded = progress.downloaded || '0 MB';
                            const total = progress.total || '0 MB';
                            downloadedDisplay.textContent = `${downloaded} / ${total}`;

                            // Log every update for debugging
                            if (percent % 10 === 0) {
                                console.log(`Progress: ${percent}%, Speed: ${speed}, ETA: ${eta}, Elapsed: ${elapsed}s`);
                            }
                        } else if (progress.status === 'finished') {
                            // Download complete
                            progressFill.style.width = '100%';
                            progressPercent.textContent = '100%';
                            speedDisplay.textContent = 'Complete';
                            etaDisplay.textContent = '0s';

                            const elapsed = progress.elapsed || 0;
                            elapsedDisplay.textContent = formatElapsedTime(elapsed);

                            // Auto-save file
                            saveFileToFolder(progress.download_url, progress.filename, format);

                            // Show download complete section
                            downloadComplete.style.display = 'flex';

                            showToast('Download complete! File saved.', 'success');

                            eventSource.close();

                            downloadVideoBtn.disabled = false;
                            downloadVideoBtn.innerHTML = '<i class="fas fa-download"></i> Start Download';
                        } else if (progress.status === 'error') {
                            console.error('Download error:', progress.message);
                            showToast('Download failed: ' + (progress.message || 'Unknown error'), 'error');

                            progressFill.style.width = '0%';
                            progressPercent.textContent = '0%';

                            eventSource.close();

                            downloadVideoBtn.disabled = false;
                            downloadVideoBtn.innerHTML = '<i class="fas fa-download"></i> Start Download';
                        }
                    };

                    // Helper function to format elapsed time
                    function formatElapsedTime(seconds) {
                        if (seconds < 60) {
                            return seconds + 's';
                        } else if (seconds < 3600) {
                            const mins = Math.floor(seconds / 60);
                            const secs = seconds % 60;
                            return `${mins}m ${secs}s`;
                        } else {
                            const hours = Math.floor(seconds / 3600);
                            const mins = Math.floor((seconds % 3600) / 60);
                            return `${hours}h ${mins}m`;
                        }
                    }

                    eventSource.onerror = function (error) {
                        console.error('SSE Error:', error);
                        eventSource.close();

                        downloadVideoBtn.disabled = false;
                        downloadVideoBtn.innerHTML = '<i class="fas fa-download"></i> Start Download';
                    };
                } else {
                    showToast(data.message || 'Download failed', 'error');

                    downloadVideoBtn.disabled = false;
                    downloadVideoBtn.innerHTML = '<i class="fas fa-download"></i> Start Download';
                }
            } catch (error) {
                console.error('Download error:', error);
                showToast('Network error. Please try again.', 'error');

                downloadVideoBtn.disabled = false;
                downloadVideoBtn.innerHTML = '<i class="fas fa-download"></i> Start Download';
            }
        });

        // Helper function to save file
        async function saveFileToFolder(downloadUrl, filename, format) {
            if (!downloadUrl || !filename) return;

            try {
                const fileResponse = await fetch(downloadUrl);
                const blob = await fileResponse.blob();

                if (window.singleVideoDownloadDirectory && 'showDirectoryPicker' in window) {
                    try {
                        const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');

                        const fileHandle = await window.singleVideoDownloadDirectory.getFileHandle(
                            safeFilename,
                            { create: true }
                        );
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();

                        console.log('File saved to:', window.singleVideoDownloadDirectory.name);
                    } catch (error) {
                        console.error('Error writing file:', error);
                        downloadWithBrowser(downloadUrl, filename, format);
                    }
                } else {
                    downloadWithBrowser(downloadUrl, filename, format);
                }
            } catch (error) {
                console.error('Download error:', error);
                downloadWithBrowser(downloadUrl, filename, format);
            }
        }

        function downloadWithBrowser(url, filename, format) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `video.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // ========== Playlist Downloader Form Handling ==========
    // Global variable for selected download directory
    window.selectedDownloadDirectory = null;

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
                        window.selectedDownloadDirectory = dirHandle;

                        // Display selected location
                        if (locationDisplay && locationPath) {
                            locationDisplay.style.display = 'flex';
                            locationPath.textContent = `Saving to: ${dirHandle.name}`;
                        }

                        showToast(`Download location set to: ${dirHandle.name}`, 'success');
                    } else {
                        showToast('Your browser does not support folder selection. Files will be saved to Downloads folder.', 'warning');
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
                window.selectedDownloadDirectory = null;
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
                showToast('Could not reach the server to fetch the playlist. Please check if the app is still running.', 'error');
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
        window.downloadVideo = async function (videoId, index, quality = null, format = null) {
            quality = quality || qualitySelect.value;
            format = format || (formatSelect ? formatSelect.value : 'mp4');
            const progressBar = document.getElementById(`progress-${index}`);
            const progressFill = document.getElementById(`progress-fill-${index}`);
            const speedEl = document.getElementById(`speed-${index}`);

            if (progressBar) progressBar.style.display = 'block';
            if (speedEl) {
                speedEl.style.display = 'block';
                speedEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing download...';
            }

            try {
                // Start download request
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

                const data = await response.json();

                if (data.status === 'success') {
                    // Start listening to progress updates via SSE
                    const eventSource = new EventSource(`/download_progress/${videoId}`);

                    eventSource.onmessage = function (event) {
                        const progress = JSON.parse(event.data);

                        if (progress.status === 'downloading' || progress.status === 'starting') {
                            // Update progress bar
                            if (progressFill) progressFill.style.width = progress.percent + '%';

                            if (speedEl) {
                                speedEl.innerHTML = `
                                    <i class="fas fa-download"></i> ${progress.percent}% • 
                                    <i class="fas fa-tachometer-alt"></i> ${progress.speed} • 
                                    <i class="fas fa-clock"></i> ${progress.elapsed}s elapsed • 
                                    <i class="fas fa-hourglass-half"></i> ETA: ${progress.eta}
                                `;
                            }
                        } else if (progress.status === 'finished') {
                            // Download complete
                            if (progressFill) progressFill.style.width = '100%';
                            if (speedEl) {
                                speedEl.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> Download complete! Saving file...';
                            }

                            // Download file from server
                            if (progress.download_url) {
                                downloadWithBrowser(progress.download_url, progress.filename, format);
                                if (speedEl) {
                                    speedEl.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> ✅ File saved!';
                                }
                                showToast('Download complete! File saved.', 'success');
                            }

                            // Close event source
                            eventSource.close();
                        } else if (progress.status === 'error') {
                            if (progressFill) progressFill.style.width = '0%';
                            if (speedEl) {
                                speedEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> Download failed';
                            }
                            showToast(progress.message || 'Download failed', 'error');
                            eventSource.close();
                        }
                    };

                    eventSource.onerror = function (error) {
                        console.error('SSE Error:', error);
                        if (speedEl) {
                            speedEl.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i> Connection error';
                        }
                        eventSource.close();
                    };
                } else {
                    if (progressFill) progressFill.style.width = '0%';
                    if (speedEl) {
                        speedEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> Download failed';
                    }
                    showToast(data.message || 'Download failed', 'error');
                }
            } catch (error) {
                console.error('Download error:', error);
                if (speedEl) {
                    speedEl.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i> Error occurred';
                }
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


    // ========== YouTube URL Validation ==========
    function isValidYouTubeURL(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return youtubeRegex.test(url);
    }
});
