'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/app/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  fallback?: string;
  lazy?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  fallback = '/images/placeholder.png',
  lazy = true,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  // Generate blur placeholder if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    // Simple base64 blur placeholder
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAADAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
  };

  if (error) {
    return (
      <div className={cn('relative', className)} ref={imgRef}>
        <Image
          src={fallback}
          alt={alt}
          width={width || 400}
          height={height || 300}
          className={className}
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={imgRef}>
      {/* Show skeleton while loading */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      {/* Render image only when in view */}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={width || 400}
          height={height || 300}
          className={cn(
            className,
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={placeholder === 'blur' ? getBlurDataURL() : undefined}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : undefined}
        />
      )}
    </div>
  );
}

// Responsive image component
export function ResponsiveImage({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  ...props
}: OptimizedImageProps & { aspectRatio?: string; sizes?: string }) {
  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={{ aspectRatio }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        {...props}
      />
    </div>
  );
}

// Avatar component with optimization
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  return (
    <div 
      className={cn(
        'relative rounded-full overflow-hidden bg-gray-200',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={error ? '/images/default-avatar.png' : src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

// Thumbnail gallery with lazy loading
export function ThumbnailGallery({
  images,
  onSelect,
  selectedIndex = 0,
}: {
  images: Array<{ src: string; alt: string }>;
  onSelect?: (index: number) => void;
  selectedIndex?: number;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {images.map((image, index) => (
        <button
          key={index}
          onClick={() => onSelect?.(index)}
          className={cn(
            'relative flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all',
            selectedIndex === index
              ? 'border-blue-500 scale-105'
              : 'border-gray-200 hover:border-gray-400'
          )}
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width={80}
            height={80}
            className="object-cover"
            quality={60}
          />
        </button>
      ))}
    </div>
  );
}

// Progressive image loading with multiple resolutions
export function ProgressiveImage({
  lowQualitySrc,
  highQualitySrc,
  alt,
  className,
  ...props
}: OptimizedImageProps & { lowQualitySrc?: string; highQualitySrc: string }) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || highQualitySrc);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  useEffect(() => {
    if (!lowQualitySrc) return;

    const img = new window.Image();
    img.src = highQualitySrc;
    img.onload = () => {
      setCurrentSrc(highQualitySrc);
      setIsHighQualityLoaded(true);
    };
  }, [highQualitySrc, lowQualitySrc]);

  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        src={currentSrc}
        alt={alt}
        className={cn(
          className,
          !isHighQualityLoaded && lowQualitySrc && 'filter blur-sm'
        )}
        {...props}
      />
    </div>
  );
}