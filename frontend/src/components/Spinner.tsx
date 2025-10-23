import React from 'react';

export const Spinner: React.FC<{className?: string}> = ({className = "w-5 h-5"}) => {
  return (
    <div className={`${className} border-2 border-t-2 border-gray-500 border-t-cyan-400 rounded-full animate-spin`}></div>
  );
};
