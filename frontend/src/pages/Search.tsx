import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { BlogCard } from '../components/blog/BlogCard';
import { Search as SearchIcon, Filter, AlertCircle } from 'lucide-react';

export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  
  const [blogs, setBlogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Local filter states
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter);
  const [textQuery, setTextQuery] = useState(query);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setIsLoading(true);
      try {
        // Build URL parameters
        const params: any = {};
        if (query) params.search = query;
        if (categoryFilter) params.category = categoryFilter;

        const res = await api.get('/blogs', { params });
        setBlogs(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, categoryFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams: any = {};
    if (textQuery.trim()) newParams.q = textQuery.trim();
    if (selectedCategory) newParams.category = selectedCategory;
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Filtering Box Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <SearchIcon className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by keywords..."
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-150 py-3 pl-11 pr-4 rounded-xl outline-none focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm text-slate-700 bg-slate-50 border border-slate-150 px-4 py-3 rounded-xl focus:border-brand-500 outline-none w-full md:w-48"
            >
              <option value="">All Topics</option>
              {categories.map((c) => (
                <option key={c._id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-brand-500 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/10 w-full md:w-auto"
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Results Title block */}
      <div>
        <h2 className="font-display font-extrabold text-xl text-slate-800">
          {query || categoryFilter ? (
            <>
              Search results for{' '}
              {query && <span className="text-brand-500">"{query}"</span>}
              {query && categoryFilter && ' in '}
              {categoryFilter && (
                <span className="text-brand-500">
                  {categories.find((c) => c.slug === categoryFilter)?.name || categoryFilter}
                </span>
              )}
            </>
          ) : (
            'All Stories'
          )}
        </h2>
        <p className="text-xs text-slate-400 mt-1">{blogs.length} stories matched your search filters</p>
      </div>

      {/* Results grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse bg-white border p-5 rounded-2xl h-64" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
          <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No matching stories</h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your search queries or selecting a different topic.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <BlogCard key={blog._id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
};
