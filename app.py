from flask import Flask, render_template, request, jsonify, send_file, Response, stream_with_context
import logging
import os
import re
import time
import json
from urllib.parse import urlparse, parse_qs
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Ensure downloads directory exists
os.makedirs(os.path.join(os.getcwd(), 'downloads'), exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch_playlist', methods=['POST'])
def fetch_playlist():
    """Fetch YouTube playlist videos"""
    try:
        data = request.get_json()
        playlist_url = data.get('playlist_url', '').strip()
        mode = data.get('mode', 'full')

        if not playlist_url:
            return jsonify({
                'status': 'error',
                'message': 'Playlist URL is required'
            })

        # Extract playlist ID from URL
        playlist_id = extract_playlist_id(playlist_url)
        if not playlist_id:
            return jsonify({
                'status': 'error',
                'message': 'Invalid YouTube playlist URL'
            })

        # Try to import yt-dlp for actual playlist fetching
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': 'in_playlist',
                'skip_download': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                playlist_info = ydl.extract_info(playlist_url, download=False)
                
                videos = []
                for entry in playlist_info.get('entries', []):
                    if entry:
                        # Get video ID
                        video_id = entry.get('id', '')
                        
                        # Construct thumbnail URL from video ID
                        thumbnail = f'https://i.ytimg.com/vi/{video_id}/mqdefault.jpg'
                        
                        # Get title - handle both flat and full extraction
                        title = entry.get('title', 'Unknown Title')
                        if not title or title == 'NA':
                            title = entry.get('url', 'Unknown Title')
                        
                        videos.append({
                            'video_id': video_id,
                            'title': title,
                            'thumbnail': thumbnail,
                            'duration': format_duration(entry.get('duration', 0)),
                            'author': playlist_info.get('uploader', entry.get('uploader', 'Unknown'))
                        })
                
                return jsonify({
                    'status': 'success',
                    'playlist_title': playlist_info.get('title', 'YouTube Playlist'),
                    'videos': videos,
                    'total': len(videos)
                })
                
        except ImportError:
            # Fallback: Return demo data if yt-dlp is not installed
            logger.warning("yt-dlp not installed. Returning demo data.")
            return jsonify({
                'status': 'success',
                'playlist_title': 'Demo Playlist (Install yt-dlp for real data)',
                'videos': generate_demo_videos(10),
                'total': 10
            })

    except Exception as e:
        logger.error(f"Error fetching playlist: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error fetching playlist: {str(e)}'
        })

# Store for download progress tracking
download_progress = {}

@app.route('/fetch_video_info', methods=['POST'])
def fetch_video_info():
    """Fetch YouTube video information"""
    try:
        data = request.get_json()
        video_url = data.get('video_url', '').strip()

        if not video_url:
            return jsonify({
                'status': 'error',
                'message': 'Video URL is required'
            })

        # Extract video ID from URL
        video_id = extract_video_id(video_url)
        if not video_id:
            return jsonify({
                'status': 'error',
                'message': 'Invalid YouTube video URL'
            })

        # Try to import yt-dlp for actual video info fetching
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                # Extract video information
                video_info = {
                    'video_id': video_id,
                    'title': info.get('title', 'Unknown Title'),
                    'thumbnail': info.get('thumbnail', f'https://i.ytimg.com/vi/{video_id}/mqdefault.jpg'),
                    'duration': format_duration(info.get('duration', 0)),
                    'author': info.get('uploader', 'Unknown')
                }
                
                return jsonify({
                    'status': 'success',
                    'video': video_info
                })
                
        except ImportError:
            # Fallback: Return demo data if yt-dlp is not installed
            logger.warning("yt-dlp not installed. Returning demo data.")
            return jsonify({
                'status': 'success',
                'video': {
                    'video_id': video_id,
                    'title': 'Demo Video (Install yt-dlp for real data)',
                    'thumbnail': f'https://i.ytimg.com/vi/{video_id}/mqdefault.jpg',
                    'duration': 'N/A',
                    'author': 'Demo Author'
                }
            })

    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error fetching video info: {str(e)}'
        })

@app.route('/download_video', methods=['POST'])
def download_video():
    """Download a single video"""
    try:
        data = request.get_json()
        video_id = data.get('video_id', '').strip()
        quality = data.get('quality', '720p')
        format_type = data.get('format', 'mp4')

        if not video_id:
            return jsonify({
                'status': 'error',
                'message': 'Video ID is required'
            })

        # Initialize progress for this video
        download_progress[video_id] = {
            'percent': 0,
            'speed': '0 MB/s',
            'eta': 'Calculating...',
            'downloaded': '0 MB',
            'total': '0 MB',
            'status': 'starting',
            'elapsed': 0
        }

        # Start download in background thread
        thread = threading.Thread(
            target=download_video_background,
            args=(video_id, quality, format_type)
        )
        thread.daemon = True
        thread.start()

        return jsonify({
            'status': 'success',
            'message': 'Download started',
            'video_id': video_id
        })

    except Exception as e:
        logger.error(f"Error starting download: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error starting download: {str(e)}'
        })

def download_video_background(video_id, quality, format_type):
    """Background thread for downloading video with progress tracking"""
    try:
        import yt_dlp
        
        downloads_dir = os.path.join(os.getcwd(), 'downloads')
        os.makedirs(downloads_dir, exist_ok=True)
        
        start_time = time.time()
        
        def progress_hook(d):
            if d['status'] == 'downloading':
                # Extract progress information with better parsing
                percent_str = d.get('_percent_str', '0%').strip()
                speed_str = d.get('_speed_str', '0 MB/s').strip()
                eta_str = d.get('_eta_str', 'Unknown').strip()
                
                # Parse downloaded and total bytes
                downloaded_bytes = d.get('downloaded_bytes', 0)
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                
                # Calculate elapsed time
                elapsed = int(time.time() - start_time)
                
                # Format sizes
                downloaded_mb = downloaded_bytes / (1024 * 1024)
                total_mb = total_bytes / (1024 * 1024) if total_bytes else 0
                
                # Extract numeric percent - handle both formats
                try:
                    # Remove % and any extra characters
                    percent_clean = percent_str.replace('%', '').strip()
                    percent = float(percent_clean)
                except:
                    # Fallback calculation if string parsing fails
                    if total_bytes > 0:
                        percent = (downloaded_bytes / total_bytes) * 100
                    else:
                        percent = 0
                
                # Ensure percent is valid
                percent = max(0, min(100, percent))
                
                # Clean up speed string - ensure it has units
                if speed_str and speed_str != 'Unknown':
                    # If speed doesn't have units, assume it's in bytes/s and convert
                    if not any(unit in speed_str for unit in ['KB/s', 'MB/s', 'GB/s', 'KiB/s', 'MiB/s', 'GiB/s']):
                        try:
                            speed_bytes = float(speed_str)
                            if speed_bytes > 1024 * 1024:
                                speed_str = f'{speed_bytes / (1024 * 1024):.2f} MB/s'
                            elif speed_bytes > 1024:
                                speed_str = f'{speed_bytes / 1024:.2f} KB/s'
                            else:
                                speed_str = f'{speed_bytes:.2f} B/s'
                        except:
                            pass
                else:
                    speed_str = '0 MB/s'
                
                # Clean up ETA string
                if not eta_str or eta_str == 'Unknown':
                    # Calculate ETA manually if not provided
                    if total_bytes > 0 and downloaded_bytes > 0:
                        speed = d.get('speed')
                        if speed and speed > 0:
                            remaining_bytes = total_bytes - downloaded_bytes
                            eta_seconds = int(remaining_bytes / speed)
                            if eta_seconds < 60:
                                eta_str = f'{eta_seconds}s'
                            elif eta_seconds < 3600:
                                eta_str = f'{eta_seconds // 60}m {eta_seconds % 60}s'
                            else:
                                hours = eta_seconds // 3600
                                minutes = (eta_seconds % 3600) // 60
                                eta_str = f'{hours}h {minutes}m'
                        else:
                            eta_str = 'Calculating...'
                    else:
                        eta_str = 'Calculating...'
                
                # Update progress with detailed info
                progress_data = {
                    'percent': round(percent, 1),
                    'speed': speed_str,
                    'eta': eta_str,
                    'downloaded': f'{downloaded_mb:.1f} MB',
                    'total': f'{total_mb:.1f} MB' if total_mb > 0 else 'Unknown',
                    'status': 'downloading',
                    'elapsed': elapsed
                }
                
                download_progress[video_id] = progress_data
                
                # Log progress for debugging (every 5%)
                if int(percent) % 5 == 0 or percent == 100:
                    logger.info(f"Video {video_id}: {percent:.1f}% - {speed_str} - ETA: {eta_str} - Downloaded: {downloaded_mb:.1f}MB/{total_mb:.1f}MB")
                
            elif d['status'] == 'finished':
                elapsed = int(time.time() - start_time)
                
                # Get final file size
                filename = d.get('filename', '')
                file_size = 0
                if filename and os.path.exists(filename):
                    file_size = os.path.getsize(filename) / (1024 * 1024)
                
                download_progress[video_id] = {
                    'percent': 100,
                    'speed': 'Complete',
                    'eta': '0s',
                    'downloaded': f'{file_size:.1f} MB',
                    'total': f'{file_size:.1f} MB',
                    'status': 'finished',
                    'elapsed': elapsed,
                    'filename': os.path.basename(filename)
                }
                logger.info(f"Video {video_id}: Download finished in {elapsed}s - Size: {file_size:.1f}MB")
        
        # Map quality to format codes
        if format_type == 'mp3':
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
                'quiet': False,
                'no_warnings': False,
                'progress_hooks': [progress_hook],
                'noprogress': False,
                'verbose': True,
            }
        else:
            quality_map = {
                '1080p': 'best[height<=1080]',
                '720p': 'best[height<=720]',
                '480p': 'best[height<=480]',
                '360p': 'best[height<=360]'
            }
            
            ydl_opts = {
                'format': quality_map.get(quality, 'best'),
                'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
                'quiet': False,
                'no_warnings': False,
                'progress_hooks': [progress_hook],
                'noprogress': False,
                'verbose': True,
                'merge_output_format': 'mp4',
            }
        
        video_url = f'https://www.youtube.com/watch?v={video_id}'
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            
            # Get the actual filename
            if format_type == 'mp3':
                filename = ydl.prepare_filename(info).replace('.webm', '.mp3').replace('.m4a', '.mp3')
            else:
                filename = ydl.prepare_filename(info)
            
            # Update final status
            download_progress[video_id]['filename'] = os.path.basename(filename)
            download_progress[video_id]['download_url'] = f'/serve_file/{os.path.basename(filename)}'
            
    except ImportError:
        logger.warning("yt-dlp not installed")
        download_progress[video_id] = {
            'percent': 0,
            'speed': 'N/A',
            'eta': 'N/A',
            'status': 'error',
            'message': 'yt-dlp not installed'
        }
    except Exception as e:
        logger.error(f"Error in background download: {str(e)}")
        download_progress[video_id] = {
            'percent': 0,
            'speed': 'N/A',
            'eta': 'N/A',
            'status': 'error',
            'message': str(e)
        }

@app.route('/download_progress/<video_id>')
def get_download_progress(video_id):
    """Server-Sent Events endpoint for real-time progress updates"""
    def generate():
        while True:
            if video_id in download_progress:
                progress = download_progress[video_id]
                yield f"data: {json.dumps(progress)}\n\n"
                
                # Stop streaming if download is finished or errored
                if progress.get('status') in ['finished', 'error']:
                    break
            else:
                yield f"data: {{\"status\": \"waiting\"}}\n\n"
            
            time.sleep(0.3)  # Update every 300ms for faster updates
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@app.route('/download_single', methods=['POST'])
def download_single():
    """Download a single YouTube video by URL"""
    try:
        data = request.get_json()
        video_url = data.get('video_url', '').strip()
        quality = data.get('quality', '720p')
        format_type = data.get('format', 'mp4')

        if not video_url:
            return jsonify({
                'status': 'error',
                'message': 'Video URL is required'
            })

        # Extract video ID from URL
        video_id = extract_video_id(video_url)
        if not video_id:
            return jsonify({
                'status': 'error',
                'message': 'Invalid YouTube video URL'
            })

        # Initialize progress for this video
        download_progress[video_id] = {
            'percent': 0,
            'speed': '0 MB/s',
            'eta': 'Calculating...',
            'downloaded': '0 MB',
            'total': '0 MB',
            'status': 'starting',
            'elapsed': 0
        }

        # Start download in background thread
        thread = threading.Thread(
            target=download_video_background,
            args=(video_id, quality, format_type)
        )
        thread.daemon = True
        thread.start()

        return jsonify({
            'status': 'success',
            'message': 'Download started',
            'video_id': video_id
        })

    except Exception as e:
        logger.error(f"Error starting download: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error starting download: {str(e)}'
        })

@app.route('/serve_file/<filename>')
def serve_file(filename):
    """Serve downloaded file to user"""
    try:
        downloads_dir = os.path.join(os.getcwd(), 'downloads')
        file_path = os.path.join(downloads_dir, filename)
        
        if os.path.exists(file_path):
            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename
            )
        else:
            return jsonify({
                'status': 'error',
                'message': 'File not found'
            }), 404
    except Exception as e:
        logger.error(f"Error serving file: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error serving file: {str(e)}'
        }), 500

# Helper Functions
def extract_playlist_id(url):
    """Extract playlist ID from YouTube URL"""
    try:
        parsed = urlparse(url)
        if 'youtube.com' in parsed.netloc or 'youtu.be' in parsed.netloc:
            query = parse_qs(parsed.query)
            return query.get('list', [None])[0]
    except:
        pass
    return None

def extract_video_id(url):
    """Extract video ID from YouTube URL"""
    try:
        parsed = urlparse(url)
        if 'youtube.com' in parsed.netloc:
            query = parse_qs(parsed.query)
            return query.get('v', [None])[0]
        elif 'youtu.be' in parsed.netloc:
            return parsed.path.strip('/')
    except:
        pass
    return None

def format_duration(seconds):
    """Format duration in seconds to MM:SS"""
    if not seconds:
        return 'N/A'
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"

def generate_demo_videos(count=10):
    """Generate demo video data for testing"""
    demo_videos = []
    for i in range(1, count + 1):
        demo_videos.append({
            'video_id': f'demo_id_{i}',
            'title': f'Demo Video {i} - Sample Content',
            'thumbnail': 'https://via.placeholder.com/320x180/000000/e50914?text=Demo+Video',
            'duration': f'{i}:{(i*13)%60:02d}',
            'author': 'Demo Channel'
        })
    return demo_videos

if __name__ == '__main__':
    # Using 0.0.0.0 to allow network access, port 8080 for stability
    app.run(debug=False, host='0.0.0.0', port=8080)
