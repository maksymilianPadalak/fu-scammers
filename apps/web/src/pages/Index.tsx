import Hero from "@/components/Hero";
import VideoUpload from "@/components/VideoUpload";

const Index = () => {
  const scrollToUpload = () => {
    const uploadSection = document.getElementById('upload');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Hero onScrollToUpload={scrollToUpload} />
      <VideoUpload />
    </main>
  );
};

export default Index;
