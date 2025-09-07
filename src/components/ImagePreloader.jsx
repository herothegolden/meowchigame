// src/components/ImagePreloader.jsx - Fixed syntax error
import { useEffect } from 'react';
import { PIECE_IMAGES } from '../utils/gameLogic';

const ImagePreloader = () => {
  useEffect(() => {
    console.log('🚀 Preloading Meowchi images...');
    
    const preloadImages = () => {
      const imagePromises = PIECE_IMAGES.map((src, index) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            console.log(`✅ Preloaded: ${src.split('/').pop()?.split('?')[0]}`);
            resolve(src);
          };
          img.onerror = () => {
            console.warn(`❌ Failed to preload: ${src}`);
            reject(src);
          };
          img.src = src;
        });
      });

      Promise.allSettled(imagePromises).then((results) => {
        const loaded = results.filter(r => r.status === 'fulfilled').length;
        console.log(`🎨 Preloaded ${loaded}/${PIECE_IMAGES.length} Meowchi images`);
        
        // Optional: Store preload status in localStorage
        if (loaded === PIECE_IMAGES.length) {
          localStorage.setItem('meowchi_images_preloaded', 'true');
        }
      });
    };

    // Start preloading after a short delay to not block initial app load
    const timeoutId = setTimeout(preloadImages, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // This component doesn't render anything
  return null;
};

export default ImagePreloader;
