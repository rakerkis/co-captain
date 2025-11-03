import CanvasSync from "@/components/CanvasSync";

const Canvas = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <CanvasSync />
      </div>
    </div>
  );
};

export default Canvas;
