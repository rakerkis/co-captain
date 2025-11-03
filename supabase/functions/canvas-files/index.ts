import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const canvasToken = Deno.env.get('CANVAS_API_TOKEN');
    const canvasUrl = Deno.env.get('CANVAS_INSTANCE_URL');

    if (!canvasToken || !canvasUrl) {
      throw new Error('Canvas credentials not configured');
    }

    console.log('Fetching Canvas folders...');

    // Fetch folders first
    const foldersResponse = await fetch(
      `${canvasUrl}/api/v1/users/self/folders?per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${canvasToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!foldersResponse.ok) {
      const errorText = await foldersResponse.text();
      console.error('Canvas folders API error:', foldersResponse.status, errorText);
      throw new Error(`Canvas API error: ${foldersResponse.status}`);
    }

    const folders = await foldersResponse.json();
    console.log(`Found ${folders.length} folders`);

    // Create folder lookup map
    const folderMap = new Map();
    folders.forEach((folder: any) => {
      folderMap.set(folder.id, folder);
    });

    console.log('Fetching Canvas files...');

    // Fetch files
    const filesResponse = await fetch(
      `${canvasUrl}/api/v1/users/self/files?per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${canvasToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!filesResponse.ok) {
      const errorText = await filesResponse.text();
      console.error('Canvas files API error:', filesResponse.status, errorText);
      throw new Error(`Canvas API error: ${filesResponse.status}`);
    }

    const files = await filesResponse.json();
    console.log(`Found ${files.length} files`);

    // Enrich files with folder information
    const enrichedFiles = files.map((file: any) => ({
      ...file,
      folder: file.folder_id ? folderMap.get(file.folder_id) : null,
    }));

    return new Response(JSON.stringify({ files: enrichedFiles, folders }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in canvas-files function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
