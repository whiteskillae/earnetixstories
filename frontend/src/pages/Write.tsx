import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import api from '../services/api';
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, 
  Image as ImageIcon, Link as LinkIcon, Undo, Redo, 
  Settings, AlertCircle, Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Write: React.FC = () => {
  const { id } = useParams<{ id?: string }>(); // If updating
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending_review'>('pending_review');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // SEO fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // TipTap configuration
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Tell your story...',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image rounded-lg shadow-md max-w-full my-6 cursor-grab active:cursor-grabbing',
          draggable: true,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-500 underline cursor-pointer',
        },
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: localStorage.getItem(`draft_content_${id || 'new'}`) || '',
    onUpdate: ({ editor }) => {
      localStorage.setItem(`draft_content_${id || 'new'}`, editor.getHTML());
    }
  });

  // Local Storage Drafting for fields
  useEffect(() => {
    if (!id) {
      const savedTitle = localStorage.getItem('draft_title_new');
      if (savedTitle) setTitle(savedTitle);
      
      const savedExcerpt = localStorage.getItem('draft_excerpt_new');
      if (savedExcerpt) setExcerpt(savedExcerpt);

      const savedCategory = localStorage.getItem('draft_category_new');
      if (savedCategory) setCategory(savedCategory);

      const savedTags = localStorage.getItem('draft_tags_new');
      if (savedTags) setTagsInput(savedTags);

      const savedSeoTitle = localStorage.getItem('draft_seoTitle_new');
      if (savedSeoTitle) setSeoTitle(savedSeoTitle);

      const savedSeoDesc = localStorage.getItem('draft_seoDesc_new');
      if (savedSeoDesc) setSeoDesc(savedSeoDesc);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      localStorage.setItem('draft_title_new', title);
      localStorage.setItem('draft_excerpt_new', excerpt);
      localStorage.setItem('draft_category_new', category);
      localStorage.setItem('draft_tags_new', tagsInput);
      localStorage.setItem('draft_seoTitle_new', seoTitle);
      localStorage.setItem('draft_seoDesc_new', seoDesc);
      
      // Debounce the visual indicator slightly or just update it
      const timer = setTimeout(() => setLastSaved(new Date()), 1000);
      return () => clearTimeout(timer);
    }
  }, [title, excerpt, category, tagsInput, seoTitle, seoDesc, id]);

  // Fetch categories
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const catRes = await api.get('/categories');
        setCategories(catRes.data.data);
        if (catRes.data.data.length > 0 && !category) {
          setCategory(catRes.data.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch blog data if edit mode
  useEffect(() => {
    if (!id) return;
    const fetchBlog = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/blogs/slug/${id}`); // Slug or ID
        const blog = res.data.data;
        setTitle(blog.title);
        setExcerpt(blog.excerpt);
        setCategory(blog.category._id);
        setTagsInput(blog.tags.join(', '));
        setCoverPreview(blog.coverImage);
        setStatus(blog.status);
        if (blog.scheduledAt) {
          // Format date for datetime-local input
          const d = new Date(blog.scheduledAt);
          setScheduledAt(d.toISOString().slice(0, 16));
        }
        if (blog.seo) {
          setSeoTitle(blog.seo.title || '');
          setSeoDesc(blog.seo.description || '');
        }
        editor?.commands.setContent(blog.content);
      } catch (err) {
        console.error('Failed to load blog for editing', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (editor) fetchBlog();
  }, [id, editor]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleInlineImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await api.post('/blogs/upload-inline', formData);

        // Insert into editor
        editor?.chain().focus().setImage({ src: res.data.url }).run();
      } catch (err) {
        console.error('Failed to upload inline image:', err);
      }
    };
    input.click();
  };

  const handleReuploadImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await api.post('/blogs/upload-inline', formData);

        // Replace current image
        editor?.chain().focus().setImage({ src: res.data.url }).run();
      } catch (err) {
        console.error('Failed to upload inline image:', err);
      }
    };
    input.click();
  };

  const handleAddLink = () => {
    const url = window.prompt('Enter link URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Blog title is required.');
      return;
    }
    if (!editor || editor.isEmpty) {
      setErrorMsg('Blog content is required.');
      return;
    }
    if (!excerpt.trim()) {
      setErrorMsg('Please enter an excerpt summary.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const toastId = toast.loading(status === 'pending_review' ? 'Submitting for review...' : 'Saving draft...');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', editor.getHTML());
    formData.append('excerpt', excerpt);
    formData.append('category', category);
    formData.append('status', status);
    
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    formData.append('tags', JSON.stringify(parsedTags));

    if (status as string === 'scheduled' && scheduledAt) {
      formData.append('scheduledAt', new Date(scheduledAt).toISOString());
    }

    const seoData = { title: seoTitle, description: seoDesc };
    formData.append('seo', JSON.stringify(seoData));

    if (coverFile) {
      formData.append('coverImage', coverFile);
    } else if (coverPreview) {
      formData.append('coverImage', coverPreview); // pass old url
    }

    try {
      if (id) {
        // Update
        const blogId = (await api.get(`/blogs/slug/${id}`)).data.data._id;
        await api.put(`/blogs/${blogId}`, formData);
      } else {
        // Create
        await api.post('/blogs', formData);
      }
      
      // Clear drafts on success
      localStorage.removeItem(`draft_content_${id || 'new'}`);
      localStorage.removeItem('draft_title_new');
      localStorage.removeItem('draft_excerpt_new');
      localStorage.removeItem('draft_category_new');
      localStorage.removeItem('draft_tags_new');
      localStorage.removeItem('draft_seoTitle_new');
      localStorage.removeItem('draft_seoDesc_new');
      
      toast.success(status === 'pending_review' ? 'Submitted for review!' : 'Saved successfully!', { id: toastId });
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to save blog post.';
      setErrorMsg(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!editor) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto py-6 px-4"
    >
      <Toaster position="top-center" />
      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{errorMsg}</p>
        </motion.div>
      )}

      {/* Editor Main Layout */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h1 className="font-display text-2xl font-extrabold text-slate-800">
            {id ? 'Edit Story' : 'Write a Story'}
          </h1>

          <div className="flex items-center gap-4">
            {lastSaved && !id && (
              <span className="text-[10px] text-slate-400 font-medium">
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 bg-brand-500 text-white text-xs font-bold px-4.5 py-2.5 rounded-xl hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/10"
            >
              {isLoading ? 'Uploading...' : 'Upload Post'}
            </button>
          </div>
        </div>



        {/* Cover image uploader */}
        <div className="relative group rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center min-h-[200px] hover:border-brand-300 transition-colors bg-slate-50/50">
          {coverPreview ? (
            <>
              <img
                src={coverPreview}
                alt="Cover Preview"
                className="w-full h-[220px] object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                <label className="cursor-pointer bg-white text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl shadow hover:bg-slate-50 transition-colors">
                  Replace Cover Image
                  <input type="file" onChange={handleCoverChange} accept="image/*" className="hidden" />
                </label>
              </div>
            </>
          ) : (
            <label className="cursor-pointer flex flex-col items-center p-6 text-center">
              <ImageIcon className="h-10 w-10 text-slate-400 mb-2" />
              <span className="text-sm font-semibold text-slate-600">Add a high-quality cover image</span>
              <span className="text-xs text-slate-400 mt-1">PNG, JPG, WebP up to 5MB</span>
              <input type="file" onChange={handleCoverChange} accept="image/*" className="hidden" />
            </label>
          )}
        </div>

        {/* Title Input */}
        <div>
          <input
            type="text"
            placeholder="Title of your story..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full font-display text-2xl sm:text-3xl font-black text-slate-800 placeholder-slate-300 border-none outline-none focus:ring-0 px-0"
          />
        </div>

        {/* Excerpt Input */}
        <div>
          <textarea
            placeholder="Write a brief excerpt summary for readers..."
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full text-sm text-slate-600 placeholder-slate-400 border border-slate-100 rounded-xl p-3 outline-none focus:border-brand-500 resize-none min-h-[70px]"
            maxLength={300}
          />
        </div>

        {/* TipTap Rich Text Toolbar */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}
            >
              <Bold className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
            >
              <Italic className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200' : ''}`}
            >
              <Heading1 className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}`}
            >
              <Heading2 className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`}
            >
              <List className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('orderedList') ? 'bg-slate-200' : ''}`}
            >
              <ListOrdered className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('blockquote') ? 'bg-slate-200' : ''}`}
            >
              <Quote className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('codeBlock') ? 'bg-slate-200' : ''}`}
            >
              <Code className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={handleInlineImageUpload}
              className="p-1.5 rounded hover:bg-slate-200"
            >
              <ImageIcon className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={handleAddLink}
              className={`p-1.5 rounded hover:bg-slate-200 ${editor.isActive('link') ? 'bg-slate-200' : ''}`}
            >
              <LinkIcon className="h-4 w-4 text-slate-700" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="p-1.5 rounded hover:bg-slate-200"
            >
              <Undo className="h-4 w-4 text-slate-700" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="p-1.5 rounded hover:bg-slate-200"
            >
              <Redo className="h-4 w-4 text-slate-700" />
            </button>
          </div>

          {/* Bubble Menu for Images */}
          {editor && (
            <BubbleMenu
              editor={editor}
              shouldShow={({ editor }) => editor.isActive('image')}
            >
              <div className="bg-slate-900 text-white rounded-lg p-1.5 shadow-xl flex items-center gap-1 border border-slate-700">
                <button
                  onClick={() => editor.chain().focus().deleteSelection().run()}
                  className="p-2 hover:bg-slate-800 rounded-md transition-colors"
                  title="Delete Image"
                >
                  <Trash className="h-4 w-4 text-red-400" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button
                  onClick={handleReuploadImage}
                  className="p-2 hover:bg-slate-800 rounded-md transition-colors text-xs font-semibold px-3"
                >
                  Replace
                </button>
              </div>
            </BubbleMenu>
          )}
          
          <EditorContent 
            editor={editor} 
            className="prose prose-slate max-w-none prose-headings:font-display prose-headings:font-extrabold prose-a:text-brand-500 focus:outline-none min-h-[300px]"
          />
        </div>

        {/* Metadata Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Category Topic
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm text-slate-700 bg-white border border-slate-200 p-3 rounded-xl focus:border-brand-500 outline-none"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. startup, design, coding"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-sm text-slate-800 bg-white border border-slate-200 p-3 rounded-xl focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        {/* SEO expander toggle */}
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setIsSeoOpen(!isSeoOpen)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider focus:outline-none"
          >
            <Settings className="h-4 w-4 text-brand-500" />
            Configure SEO Meta (Optional)
          </button>

          <AnimatePresence>
            {isSeoOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Meta Title Tag
                  </label>
                  <input
                    type="text"
                    placeholder="Custom SEO Title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full text-sm text-slate-800 bg-white border border-slate-200 p-2.5 rounded-xl focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Meta Description Tag
                  </label>
                  <textarea
                    placeholder="Short SEO snippet description..."
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    className="w-full text-sm text-slate-800 bg-white border border-slate-200 p-2.5 rounded-xl focus:border-brand-500 outline-none resize-none h-[70px]"
                    maxLength={160}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
