import { useState, useMemo } from 'react';
import { IrisData, Species } from '../types';
import { IRIS_DATASET, SPECIES_DETAILS } from '../data';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BarChart2, Table } from 'lucide-react';

interface DatasetExplorerProps {
  onHighlightPoint?: (point: IrisData | null) => void;
  highlightedPoint?: IrisData | null;
}

export default function DatasetExplorer({ onHighlightPoint, highlightedPoint }: DatasetExplorerProps) {
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof IrisData | 'none'>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // Stats calculation
  const stats = useMemo(() => {
    const speciesList: Species[] = ['setosa', 'versicolor', 'virginica'];
    const summary: Record<string, {
      count: number;
      avgSepalLength: number;
      avgSepalWidth: number;
      avgPetalLength: number;
      avgPetalWidth: number;
    }> = {};

    // Overall
    const allCount = IRIS_DATASET.length;
    summary['all'] = {
      count: allCount,
      avgSepalLength: IRIS_DATASET.reduce((sum, item) => sum + item.sepalLength, 0) / allCount,
      avgSepalWidth: IRIS_DATASET.reduce((sum, item) => sum + item.sepalWidth, 0) / allCount,
      avgPetalLength: IRIS_DATASET.reduce((sum, item) => sum + item.petalLength, 0) / allCount,
      avgPetalWidth: IRIS_DATASET.reduce((sum, item) => sum + item.petalWidth, 0) / allCount
    };

    // Per species
    speciesList.forEach(s => {
      const filtered = IRIS_DATASET.filter(item => item.species === s);
      const count = filtered.length || 1;
      summary[s] = {
        count: filtered.length,
        avgSepalLength: filtered.reduce((sum, item) => sum + item.sepalLength, 0) / count,
        avgSepalWidth: filtered.reduce((sum, item) => sum + item.sepalWidth, 0) / count,
        avgPetalLength: filtered.reduce((sum, item) => sum + item.petalLength, 0) / count,
        avgPetalWidth: filtered.reduce((sum, item) => sum + item.petalWidth, 0) / count
      };
    });

    return summary;
  }, []);

  // Filter & Search & Sort
  const processedData = useMemo(() => {
    let result = [...IRIS_DATASET];

    // Species filter
    if (speciesFilter !== 'all') {
      result = result.filter(item => item.species === speciesFilter);
    }

    // Search query
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(item => {
        return (
          item.species.toLowerCase().includes(q) ||
          item.sepalLength.toString().includes(q) ||
          item.sepalWidth.toString().includes(q) ||
          item.petalLength.toString().includes(q) ||
          item.petalWidth.toString().includes(q)
        );
      });
    }

    // Sort
    if (sortField !== 'none') {
      result.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        } else {
          return sortDirection === 'asc'
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
      });
    }

    return result;
  }, [search, speciesFilter, sortField, sortDirection]);

  // Handle Sort Toggle
  const handleSort = (field: keyof IrisData) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField('none');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(0);
  };

  // Pagination bounds
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, page]);

  return (
    <div id="dataset-explorer-container" className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Summary Statistics Panel */}
      <div id="stats-panel" className="lg:col-span-1 flex flex-col gap-8">
        <div className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-natural-badge text-natural-olive rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl italic text-natural-olive">Statistical Profiler</h3>
          </div>
          <p className="text-sm text-natural-muted mb-6 leading-relaxed">
            The dataset includes 150 flowers equally divided among 3 species (50 each). Compare the average measurements (in centimeters) below:
          </p>

          <div className="flex flex-col gap-4">
            {(Object.keys(stats) as Array<keyof typeof stats>).map(key => {
              const item = stats[key];
              const isAll = key === 'all';
              const sDetails = !isAll ? SPECIES_DETAILS[key as Species] : null;

              return (
                <div
                  key={key}
                  onClick={() => setSpeciesFilter(key)}
                  className={`p-5 rounded-[24px] border transition-all cursor-pointer ${
                    speciesFilter === key
                      ? 'border-natural-olive bg-[#E8E4D9]/30 shadow-2xs'
                      : 'border-natural-border/50 hover:border-natural-border bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif italic text-[15px] font-medium text-natural-text">
                      {isAll ? 'Entire Dataset' : sDetails?.name}
                    </span>
                    <span 
                      className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                      style={isAll ? { backgroundColor: 'var(--color-natural-badge)', color: 'var(--color-natural-text)' } : { backgroundColor: sDetails?.lightColor, color: sDetails?.color }}
                    >
                      n = {item.count}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3 pt-3 border-t border-natural-border/40 text-[11px] text-natural-muted">
                    <div>
                      <span className="text-natural-taupe block font-mono text-[9px] uppercase tracking-wider">Sepal Avg:</span>
                      <span className="font-mono font-semibold text-natural-text">
                        {item.avgSepalLength.toFixed(2)} × {item.avgSepalWidth.toFixed(2)} cm
                      </span>
                    </div>
                    <div>
                      <span className="text-natural-taupe block font-mono text-[9px] uppercase tracking-wider">Petal Avg:</span>
                      <span className="font-mono font-semibold text-natural-text">
                        {item.avgPetalLength.toFixed(2)} × {item.avgPetalWidth.toFixed(2)} cm
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Species Field Guide */}
        <div id="field-guide" className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
          <h4 className="font-serif italic text-lg text-natural-olive mb-4">Botanical Field Guide</h4>
          <div className="flex flex-col gap-5">
            {(Object.keys(SPECIES_DETAILS) as Species[]).map(s => {
              const details = SPECIES_DETAILS[s];
              return (
                <div key={s} className="flex gap-4">
                  <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: details.color }} />
                  <div>
                    <h5 className="text-sm font-semibold text-natural-text leading-none mb-1.5 font-serif italic">{details.name}</h5>
                    <p className="text-xs text-natural-muted leading-relaxed line-clamp-2">{details.description}</p>
                    <span className="text-[10px] font-mono text-natural-taupe block mt-1">{details.typicalRange}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dataset Table Panel */}
      <div id="table-panel" className="lg:col-span-2 bg-white rounded-[40px] border border-natural-border/60 shadow-sm p-8 flex flex-col justify-between">
        <div>
          {/* Header & Filter Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-natural-badge text-natural-olive rounded-xl">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl italic text-natural-olive">Raw Measurements</h3>
                <p className="text-xs uppercase tracking-widest text-natural-taupe mt-1">Filter, search, or sort the flower database</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-natural-taupe absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search value..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-natural-border/80 focus:outline-hidden focus:ring-2 focus:ring-natural-olive/10 focus:border-natural-olive bg-white text-natural-text"
                />
              </div>

              {/* Filter */}
              <select
                value={speciesFilter}
                onChange={e => { setSpeciesFilter(e.target.value); setPage(0); }}
                className="px-3 py-1.5 text-xs rounded-xl border border-natural-border/80 bg-white text-natural-text focus:outline-hidden focus:ring-2 focus:ring-natural-olive/10 cursor-pointer"
              >
                <option value="all">All Species</option>
                <option value="setosa">Setosa Only</option>
                <option value="versicolor">Versicolor Only</option>
                <option value="virginica">Virginica Only</option>
              </select>
            </div>
          </div>

          {/* Interactive Table */}
          <div className="overflow-x-auto rounded-[20px] border border-natural-border/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-natural-bg/40 border-b border-natural-border/60 text-xs font-semibold text-natural-olive uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">ID</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-natural-bg/50 transition-colors" onClick={() => handleSort('sepalLength')}>
                    <div className="flex items-center gap-1.5">
                      Sepal L. (cm)
                      {sortField === 'sepalLength' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-natural-olive" /> : <ChevronDown className="w-3.5 h-3.5 text-natural-olive" />)}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-natural-bg/50 transition-colors" onClick={() => handleSort('sepalWidth')}>
                    <div className="flex items-center gap-1.5">
                      Sepal W. (cm)
                      {sortField === 'sepalWidth' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-natural-olive" /> : <ChevronDown className="w-3.5 h-3.5 text-natural-olive" />)}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-natural-bg/50 transition-colors" onClick={() => handleSort('petalLength')}>
                    <div className="flex items-center gap-1.5">
                      Petal L. (cm)
                      {sortField === 'petalLength' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-natural-olive" /> : <ChevronDown className="w-3.5 h-3.5 text-natural-olive" />)}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-natural-bg/50 transition-colors" onClick={() => handleSort('petalWidth')}>
                    <div className="flex items-center gap-1.5">
                      Petal W. (cm)
                      {sortField === 'petalWidth' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-natural-olive" /> : <ChevronDown className="w-3.5 h-3.5 text-natural-olive" />)}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:bg-natural-bg/50 transition-colors" onClick={() => handleSort('species')}>
                    <div className="flex items-center gap-1.5">
                      Species
                      {sortField === 'species' && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-natural-olive" /> : <ChevronDown className="w-3.5 h-3.5 text-natural-olive" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-natural-border/30">
                {paginatedData.length > 0 ? (
                  paginatedData.map(item => {
                    const isHighlighted = highlightedPoint?.id === item.id;
                    const sDetails = SPECIES_DETAILS[item.species];

                    return (
                      <tr
                        key={item.id}
                        onMouseEnter={() => onHighlightPoint?.(item)}
                        onMouseLeave={() => onHighlightPoint?.(null)}
                        className={`transition-colors text-natural-text ${
                          isHighlighted ? 'bg-natural-badge/30 font-medium' : 'hover:bg-natural-bg/20'
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono text-xs text-natural-taupe">{item.id}</td>
                        <td className="py-3 px-4 font-mono font-medium">{item.sepalLength.toFixed(1)}</td>
                        <td className="py-3 px-4 font-mono">{item.sepalWidth.toFixed(1)}</td>
                        <td className="py-3 px-4 font-mono font-medium">{item.petalLength.toFixed(1)}</td>
                        <td className="py-3 px-4 font-mono">{item.petalWidth.toFixed(1)}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: sDetails?.color, backgroundColor: sDetails?.lightColor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sDetails?.color }} />
                            <span className="font-serif italic">{sDetails?.name}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-natural-taupe font-medium">
                      No matching flower records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-natural-border/40">
          <span className="text-xs text-natural-taupe font-mono">
            Showing {processedData.length > 0 ? page * rowsPerPage + 1 : 0} to {Math.min((page + 1) * rowsPerPage, processedData.length)} of {processedData.length} records
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-xl border border-natural-border/60 hover:border-natural-border bg-white text-natural-text disabled:opacity-30 disabled:hover:border-natural-border/60 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-xl border border-natural-border/60 hover:border-natural-border bg-white text-natural-text disabled:opacity-30 disabled:hover:border-natural-border/60 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
