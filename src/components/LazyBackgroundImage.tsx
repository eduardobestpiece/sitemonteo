import { useEffect, useRef, useState } from 'react';

interface LazyBackgroundImageProps {
  imageUrl: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  priority?: boolean;
}

export function LazyBackgroundImage({ 
  imageUrl, 
  className = '', 
  style = {}, 
  children,
  priority = false 
}: LazyBackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(priority);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || isLoaded) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Começar a carregar 50px antes de entrar na viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, isLoaded]);

  useEffect(() => {
    if (!shouldLoad || isLoaded) return;

    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
    };
    img.src = imageUrl;
  }, [shouldLoad, imageUrl, isLoaded]);

  const backgroundStyle: React.CSSProperties = {
    ...style,
    backgroundImage: isLoaded ? `url(${imageUrl})` : 'none',
    backgroundColor: isLoaded ? (style.backgroundColor || 'transparent') : (style.backgroundColor || '#131313'),
    transition: isLoaded ? 'opacity 0.3s ease-in-out' : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={backgroundStyle}
    >
      {children}
    </div>
  );
}

