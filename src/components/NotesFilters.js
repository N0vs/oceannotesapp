import { useState, useEffect } from 'react';

/**
 * Componente de filtros avançados para notas
 * Oferece filtros por texto, data, período e tags
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onFiltersChange - Callback quando filtros mudam
 * @param {Array} props.availableTopics - Array de tags disponíveis para filtro
 * @returns {JSX.Element} Elemento JSX dos filtros
 * @description Componente de filtros com múltiplas opções de filtragem
 */
const NotesFilters = ({ onFiltersChange, availableTopics = [] }) => {
  const [filters, setFilters] = useState({
    searchText: '', // Nome do ficheiro, utilizador ou email
    dateType: 'all', // 'all', 'specific-day', 'date-range', 'month-year'
    specificDate: '',
    startDate: '',
    endDate: '',
    month: '',
    year: new Date().getFullYear(),
    selectedTopics: []
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTopicToggle = (topicId) => {
    setFilters(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topicId)
        ? prev.selectedTopics.filter(id => id !== topicId)
        : [...prev.selectedTopics, topicId]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchText: '',
      dateType: 'all',
      specificDate: '',
      startDate: '',
      endDate: '',
      month: '',
      year: new Date().getFullYear(),
      selectedTopics: []
    });
  };

  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showAdvanced ? 'Ocultar Filtros' : 'Mais Filtros'}
          </button>
          <button
            onClick={clearAllFilters}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Limpar Tudo
          </button>
        </div>
      </div>

      {/* Filtro básico de pesquisa */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pesquisar por nome, utilizador ou email
        </label>
        <input
          type="text"
          value={filters.searchText}
          onChange={(e) => handleFilterChange('searchText', e.target.value)}
          placeholder="Digite para pesquisar..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showAdvanced && (
        <div className="space-y-4">
          {/* Filtros de data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtro por data
            </label>
            <select
              value={filters.dateType}
              onChange={(e) => handleFilterChange('dateType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            >
              <option value="all">Todas as datas</option>
              <option value="specific-day">Dia específico</option>
              <option value="date-range">Intervalo de datas</option>
              <option value="month-year">Mês específico</option>
            </select>

            {filters.dateType === 'specific-day' && (
              <input
                type="date"
                value={filters.specificDate}
                onChange={(e) => handleFilterChange('specificDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {filters.dateType === 'date-range' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Data inicial</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Data final</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {filters.dateType === 'month-year' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Mês</label>
                  <select
                    value={filters.month}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o mês</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ano</label>
                  <select
                    value={filters.year}
                    onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Filtros de tópicos */}
          {availableTopics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por tópicos
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map(topic => (
                  <button
                    key={topic.ID || topic.id}
                    onClick={() => handleTopicToggle(topic.ID || topic.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.selectedTopics.includes(topic.ID || topic.id)
                        ? 'text-white'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: filters.selectedTopics.includes(topic.ID || topic.id)
                        ? topic.cor || '#3B82F6'
                        : undefined
                    }}
                  >
                    {topic.nome}
                    {filters.selectedTopics.includes(topic.ID || topic.id) && (
                      <span className="ml-1 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador de filtros ativos */}
      {(filters.searchText || filters.dateType !== 'all' || filters.selectedTopics.length > 0) && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">Filtros ativos:</span>
            <span className="ml-2">
              {filters.searchText && `Pesquisa: "${filters.searchText}"`}
              {filters.dateType !== 'all' && ` | Data: ${filters.dateType}`}
              {filters.selectedTopics.length > 0 && ` | ${filters.selectedTopics.length} tópico(s)`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesFilters;
