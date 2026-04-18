/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCcw, 
  Play, 
  BookOpen,
  FileText,
  AlertCircle,
  Video,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { extractTextFromPdf } from './lib/pdf';
import { generateCartoonScript, generateCartoonImage, generateCartoonVideo } from './lib/gemini';
import { CartoonStory, CartoonScene } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [story, setStory] = useState<CartoonStory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [generatingImages, setGeneratingImages] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoLoadingStatus, setVideoLoadingStatus] = useState('');
  const [showKeySelectionOverlay, setShowKeySelectionOverlay] = useState(false);
  const [showTheory, setShowTheory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const processPdf = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setLoadingStep('Reading your PDF...');
      
      const text = await extractTextFromPdf(file);
      
      setLoadingStep('Whispering to the Toon-O-Matic...');
      const cartoonStory = await generateCartoonScript(text);
      
      setStory(cartoonStory);
      setGeneratingImages(true);
      
      // Generate images for all scenes (sequentially for simplicity/stability)
      const updatedScenes = [...cartoonStory.scenes];
      for (let i = 0; i < updatedScenes.length; i++) {
        setLoadingStep(`Drawing Scene ${i + 1} with magic ink...`);
        try {
          const imageUrl = await generateCartoonImage(updatedScenes[i].visualPrompt);
          updatedScenes[i].image = imageUrl;
          // Intermediate update so users see progress if possible (though state update is async)
          setStory({ ...cartoonStory, scenes: [...updatedScenes] });
        } catch (imgError: any) {
          console.error("Image generation failed for scene", i, imgError);
          if (imgError.message?.includes("PERMISSION_DENIED") || imgError.message?.includes("permission")) {
            setShowKeySelectionOverlay(true);
            // Stop generating more images for now
            break;
          }
          // Fallback to placeholder
          updatedScenes[i].image = `https://picsum.photos/seed/toon${i}/800/450?blur=2`;
          setStory({ ...cartoonStory, scenes: [...updatedScenes] });
        }
      }
      
      setGeneratingImages(false);
    } catch (err) {
      console.error(err);
      setError('Oops! The toon magic failed. Please try a different PDF.');
    } finally {
      setIsProcessing(false);
      setLoadingStep('');
    }
  };

  const reset = () => {
    setFile(null);
    setStory(null);
    setCurrentSceneIdx(0);
    setError(null);
  };

  const nextScene = () => {
    if (story && currentSceneIdx < story.scenes.length - 1) {
      setCurrentSceneIdx(prev => prev + 1);
    }
  };

  const prevScene = () => {
    if (currentSceneIdx > 0) {
      setCurrentSceneIdx(prev => prev - 1);
    }
  };

  const ensureApiKey = async () => {
    if (!(await window.aistudio.hasSelectedApiKey())) {
      setShowKeySelectionOverlay(true);
      return false;
    }
    return true;
  };

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setShowKeySelectionOverlay(false);
    // Proceed directly as per skill guidance
  };

  const createVideo = async () => {
    if (!story) return;
    const currentScene = story.scenes[currentSceneIdx];
    if (currentScene.videoUrl) return;

    if (!(await ensureApiKey())) return;

    try {
      setIsVideoLoading(true);
      setVideoLoadingStatus('Starting the engine...');
      
      const videoUrl = await generateCartoonVideo(
        currentScene.visualPrompt,
        (status) => setVideoLoadingStatus(status)
      );
      
      const updatedScenes = [...story.scenes];
      updatedScenes[currentSceneIdx] = { ...currentScene, videoUrl };
      setStory({ ...story, scenes: updatedScenes });
    } catch (err: any) {
      console.error(err);
      if (err.message === "API_KEY_NOT_FOUND" || err.message?.includes("PERMISSION_DENIED") || err.message?.includes("permission")) {
        setShowKeySelectionOverlay(true);
      } else {
        setError('Video magic failed. Please try again.');
      }
    } finally {
      setIsVideoLoading(false);
      setVideoLoadingStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-bg-soft font-sans selection:bg-cream overflow-hidden">
      {/* Playful Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-[10%] opacity-20"
        >
          <div className="w-32 h-12 bg-cream rounded-full blur-xl" />
        </motion.div>
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-40 right-[15%] opacity-20"
        >
          <div className="w-40 h-16 bg-terracotta rounded-full blur-xl" />
        </motion.div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col items-center">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-terracotta mb-6">
            <Sparkles className="w-8 h-8 text-sage" />
          </div>
          <h1 className="text-6xl font-bold italic text-earthy-green tracking-tight mb-2">
            Toonify<span className="text-clay">PDF</span>
          </h1>
          <p className="text-lg text-sage font-medium">Transform your PDFs into natural, hand-drawn cartoons.</p>
          <button 
            onClick={() => setShowTheory(true)}
            className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-clay hover:text-ink transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Detailed Theory & Magic</span>
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {!story && !isProcessing && (
            <motion.div 
              key="upload"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-xl"
            >
              <div 
                className={cn(
                  "relative group cursor-pointer aspect-video rounded-toon border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm",
                  file ? "border-clay bg-cream/30" : "border-terracotta hover:border-earthy-green hover:bg-white"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf" 
                  className="hidden" 
                />
                
                <div className="p-6 rounded-full bg-cream group-hover:scale-110 transition-transform mb-4">
                  {file ? (
                    <FileText className="w-12 h-12 text-clay" />
                  ) : (
                    <Upload className="w-12 h-12 text-sage" />
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-ink mb-1 font-serif">
                    {file ? file.name : "Select Document"}
                  </h3>
                  <p className="text-sage font-medium uppercase text-xs tracking-widest">
                    {file ? "Ready to sketch" : "PDF files only"}
                  </p>
                </div>

                {file && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-4 -right-4 p-3 bg-clay text-white rounded-full shadow-lg"
                  >
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                )}
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-medium"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              <div className="mt-10 flex justify-center">
                <button
                  onClick={processPdf}
                  disabled={!file}
                  className={cn(
                    "px-10 py-5 rounded-full text-xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center gap-3",
                    "bg-earthy-green text-white hover:bg-ink shadow-sage/20 hover:shadow-2xl hover:-translate-y-1"
                  )}
                >
                  <Play className={cn("w-6 h-6 fill-current", !file && "fill-none")} />
                  ANIMATE SCENES
                </button>
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-20"
            >
              <div className="relative mb-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-40 h-40 border-[6px] border-cream border-t-clay rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="w-16 h-16 text-sage" />
                </motion.div>
              </div>
              <h2 className="text-3xl font-bold text-ink mb-4 font-serif italic">{loadingStep}</h2>
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                    className="w-3 h-3 bg-clay rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {story && !isProcessing && (
            <motion.div 
              key="story"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full"
            >
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white/80 backdrop-blur px-8 py-5 rounded-3xl shadow-sm border-2 border-terracotta">
                <div className="flex items-center gap-5 mb-4 sm:mb-0">
                  <div className="p-4 bg-earthy-green rounded-2xl shadow-inner">
                    <BookOpen className="w-6 h-6 text-cream" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-ink italic font-serif leading-none">{story.title}</h2>
                    <p className="text-xs text-sage font-bold uppercase tracking-widest mt-2">
                      Scene {currentSceneIdx + 1} of {story.scenes.length}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={reset}
                  className="px-6 py-2 border-2 border-terracotta hover:bg-cream rounded-xl transition-colors text-ink flex items-center gap-2 font-bold text-sm"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Start New Story</span>
                </button>
              </div>

              {/* Story Canvas */}
              <div className="grid lg:grid-cols-5 gap-8 items-stretch">
                {/* Visual Area */}
                <div className="lg:col-span-3 relative group overflow-hidden rounded-workspace bg-white shadow-2xl flex items-center justify-center border-[12px] border-cream">
                  <AnimatePresence mode="wait">
                    {story.scenes[currentSceneIdx].videoUrl ? (
                      <motion.video 
                        key={currentSceneIdx + 'video'}
                        src={story.scenes[currentSceneIdx].videoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    ) : story.scenes[currentSceneIdx].image ? (
                      <motion.img 
                        key={currentSceneIdx + 'img'}
                        src={story.scenes[currentSceneIdx].image}
                        alt="Cartoon Scene"
                        initial={{ opacity: 0, filter: 'sepia(0.5)' }}
                        animate={{ opacity: 1, filter: 'sepia(0)' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-sage">
                        <Sparkles className="w-16 h-16 animate-pulse mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">Sketching Scene...</p>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Video Loading Overlay */}
                  <AnimatePresence>
                    {isVideoLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-ink/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20"
                      >
                        <Loader2 className="w-12 h-12 animate-spin text-clay mb-4" />
                        <p className="text-xl font-bold italic font-serif">{videoLoadingStatus}</p>
                        <p className="text-xs text-sage mt-2 uppercase tracking-widest font-bold">This may take a minute...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Overlay */}
                  <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button 
                      onClick={prevScene}
                      disabled={currentSceneIdx === 0}
                      className="p-4 bg-white/90 backdrop-blur hover:bg-ink hover:text-white rounded-full shadow-xl disabled:opacity-0 transition-all active:scale-90 text-clay"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={nextScene}
                      disabled={currentSceneIdx === story.scenes.length - 1}
                      className="p-4 bg-white/90 backdrop-blur hover:bg-ink hover:text-white rounded-full shadow-xl disabled:opacity-0 transition-all active:scale-90 text-clay"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2 flex flex-col">
                  <motion.div 
                    key={currentSceneIdx + 'text'}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex-grow flex flex-col p-10 bg-white rounded-workspace shadow-xl border-4 border-cream relative overflow-hidden"
                  >
                    <div className="mb-8">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black text-sage block mb-2">SCENE TITLE</span>
                      <h3 className="text-3xl font-bold text-earthy-green italic font-serif leading-tight">
                        {story.scenes[currentSceneIdx].title}
                      </h3>
                    </div>
                    
                    <div className="flex-grow">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black text-sage block mb-3">NARRATION</span>
                      <p className="text-xl font-medium text-ink leading-relaxed">
                        "{story.scenes[currentSceneIdx].narration}"
                      </p>
                    </div>

                    {!story.scenes[currentSceneIdx].videoUrl && (
                      <button
                        onClick={createVideo}
                        disabled={isVideoLoading}
                        className="w-full mt-6 py-4 bg-cream border-2 border-clay rounded-2xl flex items-center justify-center gap-3 text-clay font-bold hover:bg-clay hover:text-white transition-all group active:scale-95 disabled:opacity-50"
                      >
                        <Video className="w-5 h-5 group-hover:animate-pulse" />
                        GENERATE 3D ANIMATION
                      </button>
                    )}

                    {story.scenes[currentSceneIdx].videoUrl && (
                      <div className="mt-6 p-4 bg-earthy-green/10 border border-earthy-green/20 rounded-2xl flex items-center justify-center gap-2 text-earthy-green font-bold text-xs">
                        <Video className="w-4 h-4" />
                        3D ANIMATION LOADED
                      </div>
                    )}

                    <div className="mt-10 grid grid-cols-2 gap-4">
                      <button
                        onClick={prevScene}
                        disabled={currentSceneIdx === 0}
                        className="py-4 px-4 border-2 border-terracotta rounded-2xl text-ink font-bold hover:bg-cream disabled:opacity-30 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <ChevronLeft className="w-5 h-5" /> PREVIOUS
                      </button>
                      <button
                        onClick={nextScene}
                        disabled={currentSceneIdx === story.scenes.length - 1}
                        className="py-4 px-4 bg-clay rounded-2xl text-white font-bold hover:bg-ink disabled:opacity-30 shadow-lg shadow-clay/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                      >
                        NEXT <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Storyboard Timeline */}
              <div className="mt-12 bg-cream/40 p-6 rounded-[2.5rem] border border-terracotta">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-[10px] font-black text-earthy-green uppercase tracking-[0.3em] vertical-writing opacity-50">STORYBOARD</div>
                  <div className="flex-grow h-px bg-terracotta opacity-30" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {story.scenes.map((scene, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSceneIdx(i)}
                      className={cn(
                        "flex-shrink-0 w-32 aspect-video rounded-xl border-2 transition-all overflow-hidden relative group",
                        i === currentSceneIdx ? "border-clay ring-4 ring-clay/20 scale-105" : "border-terracotta opacity-60 hover:opacity-100 hover:scale-102"
                      )}
                    >
                      {scene.image ? (
                        <img src={scene.image} className="w-full h-full object-cover" alt={`Scene ${i+1}`} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-white flex items-center justify-center">
                          <span className="text-[10px] font-bold text-sage">SCENE {i+1}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-ink/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold text-white uppercase">{i+1}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* API Key Selection Overlay */}
      <AnimatePresence>
        {showKeySelectionOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-ink/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full text-center shadow-2xl relative border-4 border-terracotta"
            >
              <div className="w-20 h-20 bg-cream rounded-2xl flex items-center justify-center mx-auto mb-8">
                <Sparkles className="w-10 h-10 text-clay" />
              </div>
              <h2 className="text-3xl font-bold text-earthy-green font-serif italic mb-4">Premium Magic Required</h2>
              <p className="text-sage font-medium mb-8 leading-relaxed">
                To generate 3D animated videos, you'll need to use your own Google Cloud API Key. This ensures high-quality rendering just for you!
              </p>
              
              <div className="bg-bg-soft rounded-2xl p-6 mb-8 text-left border border-terracotta/30">
                <p className="text-xs font-bold text-ink uppercase tracking-widest mb-2">Instructions</p>
                <ol className="text-sm text-ink space-y-2 list-decimal list-inside opacity-80">
                  <li>Select a paid billing project</li>
                  <li>Ensure the Gemini API is enabled</li>
                  <li>Pick your key from the list</li>
                </ol>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSelectKey}
                  className="w-full py-5 bg-clay text-white rounded-2xl font-bold text-lg shadow-xl shadow-clay/30 hover:bg-ink transition-all active:scale-95"
                >
                  SELECT MY API KEY
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-sage font-bold underline hover:text-clay"
                >
                  Learn about Billing & API Keys
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theory & Magic Detailed Overlay */}
      <AnimatePresence>
        {showTheory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-bg-soft/95 backdrop-blur-xl flex flex-col items-center overflow-y-auto px-6 py-20"
          >
            <button 
              onClick={() => setShowTheory(false)}
              className="fixed top-8 right-8 p-4 bg-white rounded-full shadow-lg border border-terracotta text-ink hover:scale-110 active:scale-90 transition-all z-[120]"
            >
              <RefreshCcw className="w-6 h-6" />
            </button>

            <div className="max-w-4xl w-full">
              <div className="text-center mb-20">
                <span className="text-[10px] font-black text-clay uppercase tracking-[0.4em] block mb-4">Scientific Context</span>
                <h2 className="text-7xl font-bold font-serif italic text-earthy-green mb-6">The Theory of Magic</h2>
                <div className="h-1 w-24 bg-terracotta mx-auto rounded-full" />
              </div>

              <div className="space-y-16">
                {/* PDF Logic */}
                <section className="grid md:grid-cols-5 gap-8 items-start">
                  <div className="md:col-span-1">
                    <span className="text-8xl font-serif font-black text-terracotta/20 leading-none">01</span>
                  </div>
                  <div className="md:col-span-4 bg-white p-10 rounded-[2.5rem] shadow-sm border border-terracotta/20">
                    <h3 className="text-3xl font-bold font-serif italic text-ink mb-4">Semantic PDF Reconstruction</h3>
                    <p className="text-sage font-medium leading-relaxed mb-6">
                      PDFs aren't "books" to a computer; they are a chaotic collection of glyph coordinates. Our reader using <strong>PDF.js</strong> performs low-level character traversal, grouping floating glyphs based on spatial proximity to reconstruct semantic flow. It turns unstructured vectors back into a meaningful narrative.
                    </p>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Spatiotemporal Parsing</span>
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Contextual Extraction</span>
                    </div>
                  </div>
                </section>

                {/* Gemini Scripting */}
                <section className="grid md:grid-cols-5 gap-8 items-start">
                  <div className="md:col-span-1">
                    <span className="text-8xl font-serif font-black text-terracotta/20 leading-none">02</span>
                  </div>
                  <div className="md:col-span-4 bg-white p-10 rounded-[2.5rem] shadow-sm border border-terracotta/20">
                    <h3 className="text-3xl font-bold font-serif italic text-ink mb-4">Cognitive Narrative Synthesis</h3>
                    <p className="text-sage font-medium leading-relaxed mb-6">
                      <strong>Gemini 3 Flash</strong> serves as the narrative architect. Using heavy "System Instructions," it identifies recurring motifs and character arcs within the extracted text. It performs "Chain-of-Thought" reasoning to translate dry data into kid-friendly emotional beats, ensuring every scene has a rhythmic narrative flow and structural consistency.
                    </p>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">LLM Chain-of-Thought</span>
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Narrative Beat Mapping</span>
                    </div>
                  </div>
                </section>

                {/* Image Generation */}
                <section className="grid md:grid-cols-5 gap-8 items-start">
                  <div className="md:col-span-1">
                    <span className="text-8xl font-serif font-black text-terracotta/20 leading-none">03</span>
                  </div>
                  <div className="md:col-span-4 bg-white p-10 rounded-[2.5rem] shadow-sm border border-terracotta/20">
                    <h3 className="text-3xl font-bold font-serif italic text-ink mb-4">Latent Illustrator (2.5 Image)</h3>
                    <p className="text-sage font-medium leading-relaxed mb-6">
                      Visualization is handled through <strong>Diffusion</strong>. The model interprets the complex visual prompts—which specifically define line weights, color palettes, and stylistic archetypes (like 'Hilda' or 'Bluey')—to render 2D vector-style art. By locking character descriptions, we maintain "Latent Consistency" across the generated storyboard.
                    </p>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Diffusion Sampling</span>
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Stylistic Archetypes</span>
                    </div>
                  </div>
                </section>

                {/* Veo Animation */}
                <section className="grid md:grid-cols-5 gap-8 items-start">
                  <div className="md:col-span-1">
                    <span className="text-8xl font-serif font-black text-terracotta/20 leading-none">04</span>
                  </div>
                  <div className="md:col-span-4 bg-white p-10 rounded-[2.5rem] shadow-sm border border-terracotta/20">
                    <h3 className="text-3xl font-bold font-serif italic text-ink mb-4">Spatiotemporal Motion Logic</h3>
                    <p className="text-sage font-medium leading-relaxed mb-6">
                      The final 3D stage uses <strong>Veo 3.1</strong>. Unlike static generation, Veo understands 3D physics and lighting. It generates motion vectors that preserve character identity while injecting fluid movement and cinematic camera pans. It bridges the gap between a "sketch" and a "living world" through temporal frame-by-frame synthesis.
                    </p>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Motion Vectors</span>
                      <span className="px-3 py-1 bg-cream rounded-lg text-[10px] font-bold text-ink tracking-widest uppercase">Physics-Based Rendering</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-20 py-10 border-t border-terracotta/30 flex justify-between items-center px-4">
                <p className="text-[10px] font-bold text-sage tracking-[0.25em]">SYNERGETIC AI ARCHITECTURE v1.0</p>
                <button 
                  onClick={() => setShowTheory(false)}
                  className="px-8 py-3 bg-earthy-green text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-ink transition-all active:scale-95"
                >
                  Return to Studio
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="mt-auto py-12 text-center">
        <div className="inline-block px-6 py-2 rounded-full border border-terracotta bg-white/50 text-sage text-xs font-bold tracking-widest uppercase">
          Crafted with Natural Tones & AI Magic
        </div>
      </footer>
    </div>
  );
}
