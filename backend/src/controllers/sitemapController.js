const Blog = require('../models/Blog');
const Category = require('../models/Category');

const generateSitemap = async (req, res, next) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Get all published blogs
    const blogs = await Blog.find({ status: 'published' }).select('slug updatedAt').lean();
    
    // Get all categories
    const categories = await Category.find().select('slug').lean();

    const staticRoutes = [
      '/',
      '/categories',
      '/search',
      '/login',
      '/register',
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static routes
    staticRoutes.forEach((route) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}${route}</loc>\n`;
      sitemap += `    <changefreq>daily</changefreq>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `  </url>\n`;
    });

    // Add blogs
    blogs.forEach((blog) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/blog/${blog.slug}</loc>\n`;
      sitemap += `    <lastmod>${new Date(blog.updatedAt).toISOString()}</lastmod>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>1.0</priority>\n`;
      sitemap += `  </url>\n`;
    });

    // Add categories
    categories.forEach((category) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/categories?category=${category.slug}</loc>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>0.6</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateSitemap
};
