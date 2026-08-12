import React, { useEffect, useRef } from 'react';

export default function TelegramLoginWidget({ 
  botName, 
  buttonSize = 'large', 
  cornerRadius = 12, 
  requestAccess = 'write', 
  onAuthCallback, 
  lang = 'en' 
}) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onAuthCallback);

  // Keep callback fresh without re-triggering script load
  useEffect(() => {
    callbackRef.current = onAuthCallback;
  }, [onAuthCallback]);

  useEffect(() => {
    // 1. Define the global callback function
    window.onTelegramAuth = (user) => {
      if (callbackRef.current) {
        callbackRef.current(user);
      }
    };

    // 2. Create the script element
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius);
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-lang', lang);
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;

    // 3. Append to container
    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // Clear any existing script
      containerRef.current.appendChild(script);
    }

    // Cleanup ONLY if component unmounts
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, lang]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '40px',
        width: '100%',
        marginTop: '8px'
      }} 
    />
  );
}
