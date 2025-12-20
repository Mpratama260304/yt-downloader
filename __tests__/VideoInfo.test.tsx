import { render, screen } from '@testing-library/react';
import VideoInfoCard from '@/components/VideoInfo';
import { VideoInfo } from '@/lib/types';

describe('VideoInfoCard', () => {
  const mockVideoInfo: VideoInfo = {
    id: 'test123',
    title: 'Test Video Title',
    thumbnail: 'https://i.ytimg.com/vi/test123/maxresdefault.jpg',
    description: 'This is a test video description',
    duration: 300,
    durationString: '5:00',
    channel: 'Test Channel',
    channelUrl: 'https://www.youtube.com/c/testchannel',
    uploadDate: '20231215',
    viewCount: 1000000,
    likeCount: 50000,
    formats: [],
    isPlaylist: false,
  };

  it('renders video title', () => {
    render(<VideoInfoCard videoInfo={mockVideoInfo} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
  });

  it('renders channel name', () => {
    render(<VideoInfoCard videoInfo={mockVideoInfo} />);
    expect(screen.getByText('Test Channel')).toBeInTheDocument();
  });

  it('renders view count', () => {
    render(<VideoInfoCard videoInfo={mockVideoInfo} />);
    expect(screen.getByText(/1\.0M views/i)).toBeInTheDocument();
  });

  it('renders like count', () => {
    render(<VideoInfoCard videoInfo={mockVideoInfo} />);
    expect(screen.getByText(/50\.0K likes/i)).toBeInTheDocument();
  });

  it('renders duration', () => {
    render(<VideoInfoCard videoInfo={mockVideoInfo} />);
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('renders playlist header for playlists', () => {
    const playlistInfo: VideoInfo = {
      ...mockVideoInfo,
      isPlaylist: true,
      playlistTitle: 'Test Playlist',
      playlistCount: 10,
    };
    render(<VideoInfoCard videoInfo={playlistInfo} />);
    expect(screen.getByText('Playlist')).toBeInTheDocument();
    expect(screen.getByText('10 videos')).toBeInTheDocument();
  });
});
