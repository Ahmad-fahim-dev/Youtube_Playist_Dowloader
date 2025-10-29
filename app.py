from flask import Flask, render_template, request, jsonify, send_file
from flask import Flask, render_template, request, jsonify, send_file
import logging
import os
import re
from urllib.parse import urlparse, parse_qs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

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

        # Try to use yt-dlp for actual downloading
        try:
            import yt_dlp
            
            downloads_dir = os.path.join(os.getcwd(), 'downloads')
            os.makedirs(downloads_dir, exist_ok=True)
            
            # Progress tracking
            progress_data = {'percent': 0, 'speed': '', 'eta': ''}
            
            def progress_hook(d):
                if d['status'] == 'downloading':
                    progress_data['percent'] = d.get('_percent_str', '0%').strip()
                    progress_data['speed'] = d.get('_speed_str', 'N/A').strip()
                    progress_data['eta'] = d.get('_eta_str', 'N/A').strip()
                elif d['status'] == 'finished':
                    progress_data['percent'] = '100%'
                    progress_data['speed'] = 'Complete'
                    progress_data['eta'] = '0s'
            
            # Map quality to format codes - use single format to avoid FFmpeg requirement
            if format_type == 'mp3':
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
                    'quiet': False,
                    'no_warnings': False,
                    'progress_hooks': [progress_hook],
                }
            else:
                # Use single format to avoid FFmpeg requirement
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
                
                return jsonify({
                    'status': 'success',
                    'message': 'Video ready for download',
                    'filename': os.path.basename(filename),
                    'download_url': f'/serve_file/{os.path.basename(filename)}'
                })
                
        except ImportError:
            # Fallback: Return demo response if yt-dlp is not installed
            logger.warning("yt-dlp not installed. Returning demo response.")
            return jsonify({
                'status': 'success',
                'message': 'Demo mode: Install yt-dlp for actual downloads',
                'filename': f'demo_video_{video_id}.mp4',
                'download_url': '#'
            })

    except Exception as e:
        logger.error(f"Error downloading video: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error downloading video: {str(e)}'
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
    app.run(debug=True, host='0.0.0.0', port=5000)
