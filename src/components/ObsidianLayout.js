'use client';

import { useState } from 'react';

/**
 * Layout principal da aplicação com sidebar e painel direito
 * Gerencia posicionamento e visibilidade dos painéis laterais
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {React.ReactNode} props.children - Conteúdo principal da aplicação
 * @param {React.ReactNode} props.sidebar - Componente da sidebar esquerda
 * @param {React.ReactNode} props.rightPanel - Componente do painel direito (opcional)
 * @returns {JSX.Element} Elemento JSX do layout
 * @description Layout responsivo com controle de visibilidade de painéis laterais
 */
const ObsidianLayout = ({ children, sidebar, rightPanel = null }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex overflow-hidden">
      {/* Sidebar Esquerdo */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col`}>
        <div className="flex-1 overflow-hidden">
          {sidebarOpen && sidebar}
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              title="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {rightPanel && (
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                title="Toggle right panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </button>
            )}
            
            {/* Settings */}
            <button className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conteúdo Principal + Painel Direito */}
        <div className="flex-1 flex overflow-hidden">
          {/* Área de Conteúdo */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {/* Painel Direito */}
          {rightPanel && rightPanelOpen && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObsidianLayout;
