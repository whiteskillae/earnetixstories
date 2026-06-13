import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Award, BookOpen, BookText, Code, Compass, Heart, Landmark, Landmark as GovIcon, Sparkles } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

const iconMap: { [key: string]: any } = {
  BookOpen,
  Code,
  Compass,
  Heart,
  Landmark,
  GovIcon,
  Award,
  BookText,
  Sparkles
};

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 py-4"
    >
      <Helmet>
        <title>Categories | Earnetix Blogs</title>
        <meta name="description" content="Browse stories across a diverse range of topics, industries, and interests on Earnetix Blogs." />
      </Helmet>

      <div>
        <h1 className="font-display text-3xl font-black text-slate-900 tracking-tight">Explore Categories</h1>
        <p className="text-sm text-slate-500 mt-1">Browse stories across a diverse range of topics, industries, and interests.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border p-6 rounded-2xl h-36 flex items-start gap-4">
              <Skeleton circle width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height={20} />
                <Skeleton count={2} height={12} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const IconComponent = iconMap[cat.icon] || BookOpen;
            return (
              <Link
                key={cat._id}
                to={`/search?category=${cat.slug}`}
                className="group bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-100 transition-all flex items-start gap-4"
              >
                <div className="rounded-xl bg-brand-50 p-3 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                  <IconComponent className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-800 text-lg group-hover:text-brand-500 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {cat.description || 'No description provided.'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
