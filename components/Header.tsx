
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold tracking-wider text-white">
          SaaSVG
          <span className="text-[#00D4AA]">Pro</span>
        </h1>
      </div>
    </header>
  );
};
