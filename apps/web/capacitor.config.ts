import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.696ff24e6c13467b9ba7b449fa980aeb',
  appName: 'fuc-video-uploader',
  webDir: 'dist',
  server: {
    url: "https://696ff24e-6c13-467b-9ba7-b449fa980aeb.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;