import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Settings, X, Clock, Image as ImageIcon } from 'lucide-react';

const ArtReferenceTimer = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSettings, setShowSettings] = useState(true);
  
  // Session settings
  const [sessionConfig, setSessionConfig] = useState({
    totalImages: 20,
    timingMode: 'fixed', // 'fixed' or 'progressive'
    fixedDuration: 60, // seconds
    progressiveTimes: [30, 60, 120, 300, 600], // 30s, 1min, 2min, 5min, 10min
    shuffle: true,
    soundEnabled: true,
    autoAdvance: true
  });

  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Google Photos API setup
  // IMPORTANT: This Client ID is SAFE to commit to GitHub - it's designed to be public
  // Replace this with your own Client ID from Google Cloud Console
  const CLIENT_ID = '61975917009-q31i0e0uq1ed8sp3gm8gsdgvpg0glbrk.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/photospicker.readonly';
  
  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleAuth;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const initializeGoogleAuth = () => {
    if (window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.access_token) {
            accessTokenRef.current = response.access_token;
            setIsAuthenticated(true);
            await fetchAlbums();
          }
        },
      });
    }
  };

  const handleSignIn = () => {
    if (CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
      alert('Please set up your Google Photos API:\n\n1. Go to https://console.cloud.google.com/\n2. Create a project and enable Google Photos Library API\n3. Create OAuth 2.0 Client ID (Web application)\n4. Add http://localhost:3000 to authorized origins\n5. Replace CLIENT_ID in the code with your Client ID\n\nNote: The Client ID is safe to commit to GitHub!');
      return;
    }
    
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await fetch('https://photospicker.googleapis.com/v1/albums', {
        headers: {
          'Authorization': `Bearer ${accessTokenRef.current}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch albums');
      }

      const data = await response.json();
      
      // Filter for albums with "reference" in the title (case-insensitive)
      const referenceAlbums = (data.albums || []).filter(album => 
        album.title.toLowerCase().includes('reference')
      ).map(album => ({
        id: album.id,
        title: album.title,
        mediaItemsCount: album.mediaItemsCount || 0,
        coverPhotoUrl: album.coverPhotoBaseUrl
      }));

      setAlbums(referenceAlbums);
    } catch (error) {
      console.error('Error fetching albums:', error);
      alert('Failed to load albums. Please make sure you granted access to Google Photos.');
    }
  };

  const loadImagesFromAlbums = async () => {
    const allImages = [];
    
    try {
      for (const albumId of selectedAlbums) {
        const images = await fetchImagesFromAlbum(albumId);
        allImages.push(...images);
      }

      // Limit to requested number of images
      let selectedImages = allImages.slice(0, sessionConfig.totalImages);
      
      // If we don't have enough images, repeat the array
      while (selectedImages.length < sessionConfig.totalImages) {
        selectedImages = [...selectedImages, ...allImages];
      }
      selectedImages = selectedImages.slice(0, sessionConfig.totalImages);

      if (sessionConfig.shuffle) {
        return selectedImages.sort(() => Math.random() - 0.5);
      }
      
      return selectedImages;
    } catch (error) {
      console.error('Error loading images:', error);
      alert('Failed to load images from albums');
      return [];
    }
  };

  const fetchImagesFromAlbum = async (albumId) => {
    try {
      const response = await fetch('https://photospicker.googleapis.com/v1/mediaItems:search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessTokenRef.current}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumId: albumId,
          pageSize: 100, // Max allowed per request
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch media items');
      }

      const data = await response.json();
      
      return (data.mediaItems || []).map(item => ({
        id: item.id,
        url: `${item.baseUrl}=w2048-h2048`, // High quality image
        albumId: albumId,
        filename: item.filename
      }));
    } catch (error) {
      console.error('Error fetching images from album:', error);
      return [];
    }
  };

  const startSession = async () => {
    if (selectedAlbums.length === 0) {
      alert('Please select at least one album');
      return;
    }
    
    const sessionImages = await loadImagesFromAlbums();
    setImages(sessionImages);
    setCurrentImageIndex(0);
    setIsSessionActive(true);
    setShowSettings(false);
    setIsPaused(false);
    
    const firstDuration = calculateDuration(0);
    setTimeRemaining(firstDuration);
    startTimer(firstDuration);
  };

  const calculateDuration = (imageIndex) => {
    if (sessionConfig.timingMode === 'fixed') {
      return sessionConfig.fixedDuration;
    } else {
      // Progressive timing
      const { progressiveTimes } = sessionConfig;
      const segmentSize = Math.ceil(sessionConfig.totalImages / progressiveTimes.length);
      const segmentIndex = Math.min(
        Math.floor(imageIndex / segmentSize),
        progressiveTimes.length - 1
      );
      return progressiveTimes[segmentIndex];
    }
  };

  const startTimer = (duration) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let remaining = duration;
    setTimeRemaining(remaining);
    
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        playSound();
        if (sessionConfig.autoAdvance) {
          advanceToNextImage();
        } else {
          clearInterval(timerRef.current);
        }
      }
    }, 1000);
  };

  const advanceToNextImage = () => {
    const nextIndex = currentImageIndex + 1;
    
    if (nextIndex >= images.length) {
      endSession();
      return;
    }
    
    setCurrentImageIndex(nextIndex);
    const nextDuration = calculateDuration(nextIndex);
    startTimer(nextDuration);
  };

  const skipImage = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    advanceToNextImage();
  };

  const togglePause = () => {
    if (isPaused) {
      startTimer(timeRemaining);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  };

  const endSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSessionActive(false);
    setShowSettings(true);
    alert(`Session complete! You drew ${images.length} images.`);
  };

  const playSound = () => {
    if (sessionConfig.soundEnabled && audioRef.current) {
      audioRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAlbumSelection = (albumId) => {
    setSelectedAlbums(prev => 
      prev.includes(albumId) 
        ? prev.filter(id => id !== albumId)
        : [...prev, albumId]
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Art Reference Timer</h1>
          <p className="text-gray-600 mb-6">
            Connect your Google Photos to access your reference image albums
          </p>
          <button
            onClick={handleSignIn}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors w-full"
          >
            Connect Google Photos
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Note: Demo mode will load sample albums
          </p>
        </div>
      </div>
    );
  }

  if (isSessionActive && !showSettings) {
    const currentImage = images[currentImageIndex];
    const progress = ((currentImageIndex + 1) / images.length) * 100;
    
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-white font-semibold">
              Image {currentImageIndex + 1} / {images.length}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-white font-mono text-xl">
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <button
              onClick={skipImage}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
            >
              <SkipForward size={20} />
            </button>
            <button
              onClick={endSession}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-800 h-2">
          <div 
            className="bg-purple-600 h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Image display */}
        <div className="flex-1 flex items-center justify-center p-8">
          {currentImage && (
            <img
              src={currentImage.url}
              alt={`Reference ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
        
        {/* Timer indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className={`bg-gray-900 bg-opacity-80 text-white px-6 py-3 rounded-full text-2xl font-mono ${timeRemaining <= 5 ? 'animate-pulse text-red-400' : ''}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
        
        {/* Audio element for timer sound */}
        <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZUQ0PVqzn77BfGAg+ltryxnMpBSp+zPLaizsIGGS57OihUQ0PUKXi8bllHAU2jdXzzn0vBSh4xu/glksMElmu5fCsWBUIQ5zi8L5xKAQuf8rx3I4+CRZiturqpVITC0ml4PGzaB0GM4vU8tGAMQYbccLu45ZPDRBUqOXuq1kXCT6Y3PLEcSYELIHO8diJOQcZaLvt559NEAxPqOPwtmMcBjiP1/PMeS0GI3fH8N2RQAoUXrTp66hVFApGnt/yvmwhBjGH0fPTgjQGHm7A7eSaUQ0PVqzl77BeGQc9ltvyxnUoBSh+y/HajDsIF2W57OihUhENT6Xh8bllHAU2jdT0z3wvBSh4xu/glkwLElqt5fCsWhYIRJvi8L5yKAQuf8rx3I4+CRVht+rqpVMSC0ml4PG0aB0FM4vU8tGAMQYbccPu45dPDRBUqOXuq1kWCT+Y3PLEcSYEK4DN8tiIOQcZabrs6J9ODAxPpuPxtmQcBjiP1/PMeywGI3fH8N+RQAoUXrTp66hVFApGnt/yv2wiBjGH0fPTgjQGHm3A7eSaUg0PVq3m77BeGQc9ltrzxnUoBSh+y/HajDsIF2S57OihUxENT6Xh8blmHAU2jdT0z3wvBSh4xu/glkwLElqt5fCsWhYIRJvi8L5yKAQuf8rx3I4/CRVht+rqpVMSC0ml4PG0aB0FM4vU8tGAMQYbccPu45dPDRBUqOXuq1kWCT6Y3PLEcSYEK4DN8tiIOQcZabrs6J9ODAxPpuPxtmQcBjiP1/PMeywGI3bH8N+RQAoUXrTp66hVFApGnt/yv2wiBjCH0fPTgjQGHm3A7eSaUg0PVq3m77BeGQc9ltrzxnUoBSh+y/HajDsIF2S57OihUxENT6Xh8blmHAU2jdT0z3wvBSh4xu/glkwLElqt5fCsWhYIRJzi8L5yKAQuf8rx3I4/CRVht+rqpVMSC0ml4PG0aB0FM4vU8tGAMQYbccPu45dPDRBUqOXuq1kWCT6Y3PLEcSYEK4DN8tiIOQcZabrs6J9ODAxPpuPxtmQcBjiP1/PMeywGI3bH8N+RQAoUXrTp66hVFApGnt/yv2wiBjCH0fPTgjQGHm3A7eSaUg0PVq3m77BeGQc9ltrzxnUoBSh+y/HajDsIF2S57OihUxENUKXh8blmHAU2jdT0z3wvBSh4xu/glkwLElqt5fCsWhYIRJzi8L5yKAQuf8rx3I4/CRVht+rqpVMSC0ml4PG0aB0FM4vU8tGAMQYbccPu45dPDRBUqOXuq1kWCT6Y3PLEcSYEK4DN8tiIOQcZabrs6J9ODAxPpuPxtmQcBjiP1/PMeywGI3bH8N+RQAoUXrTp66hVFApGnt/yv2wiBjCH0fPTgjQGHm3A7eSaUg0PVq3m77BeGQc9ltrzxnUoBSh+y/HajDsIF2S57OihUxENUKXh8blmHAU2jdT0z3wvBSh4xu/glkwLElqt5fCsWhYIRJzi8L5yKAQuf8rx3I4/CRVht+rqpVMSC0ml4PG0aB0FM4vU8tGAMQYbccPu45dPDQ==" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ImageIcon className="text-purple-600" />
              Art Reference Timer
            </h1>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setAlbums([]);
                setSelectedAlbums([]);
                accessTokenRef.current = null;
              }}
              className="text-gray-600 hover:text-gray-800 text-sm underline"
            >
              Sign Out
            </button>
          </div>
          
          {/* Album Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Select Reference Albums</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {albums.map(album => (
                <label
                  key={album.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAlbums.includes(album.id)
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAlbums.includes(album.id)}
                    onChange={() => toggleAlbumSelection(album.id)}
                    className="w-5 h-5 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{album.title}</div>
                    <div className="text-sm text-gray-500">{album.mediaItemsCount} images</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* Session Configuration */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700">Session Settings</h2>
            
            {/* Total Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Images
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={sessionConfig.totalImages}
                onChange={(e) => setSessionConfig({...sessionConfig, totalImages: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
            
            {/* Timing Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timing Mode
              </label>
              <select
                value={sessionConfig.timingMode}
                onChange={(e) => setSessionConfig({...sessionConfig, timingMode: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="fixed">Fixed Duration</option>
                <option value="progressive">Progressive (Gradually Longer)</option>
              </select>
            </div>
            
            {/* Fixed Duration */}
            {sessionConfig.timingMode === 'fixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration per Image (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={sessionConfig.fixedDuration}
                  onChange={(e) => setSessionConfig({...sessionConfig, fixedDuration: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>
            )}
            
            {/* Progressive Timing */}
            {sessionConfig.timingMode === 'progressive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progressive Timing Pattern
                </label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Images will progress through these durations:</p>
                  <div className="flex flex-wrap gap-2">
                    {sessionConfig.progressiveTimes.map((time, idx) => (
                      <span key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                        {time < 60 ? `${time}s` : `${time/60}min`}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Each duration applies to an equal portion of your session
                  </p>
                </div>
              </div>
            )}
            
            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionConfig.shuffle}
                  onChange={(e) => setSessionConfig({...sessionConfig, shuffle: e.target.checked})}
                  className="w-5 h-5 text-purple-600"
                />
                <span className="text-gray-700">Shuffle images randomly</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionConfig.soundEnabled}
                  onChange={(e) => setSessionConfig({...sessionConfig, soundEnabled: e.target.checked})}
                  className="w-5 h-5 text-purple-600"
                />
                <span className="text-gray-700">Play sound when time is up</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionConfig.autoAdvance}
                  onChange={(e) => setSessionConfig({...sessionConfig, autoAdvance: e.target.checked})}
                  className="w-5 h-5 text-purple-600"
                />
                <span className="text-gray-700">Auto-advance to next image</span>
              </label>
            </div>
          </div>
          
          {/* Start Button */}
          <button
            onClick={startSession}
            disabled={selectedAlbums.length === 0}
            className="w-full mt-8 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
          >
            <Play size={24} />
            Start Drawing Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtReferenceTimer;
