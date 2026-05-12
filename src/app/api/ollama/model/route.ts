import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), '.ollama-model');

export async function GET() {
  try {
    let model = 'gemma4:31b-cloud';
    if (fs.existsSync(settingsPath)) {
      model = fs.readFileSync(settingsPath, 'utf8').trim();
    }
    return NextResponse.json({ model });
  } catch (error) {
    return NextResponse.json({ model: 'gemma4:31b-cloud' });
  }
}

export async function POST(req: Request) {
  try {
    const { model } = await req.json();
    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }
    
    fs.writeFileSync(settingsPath, model);
    
    return NextResponse.json({ model });
  } catch (error) {
    console.error('Set model error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}