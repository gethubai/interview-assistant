import React from 'react';
import { createRoot } from 'react-dom/client';

const remoteElement = document.getElementById(
  'remote'
) as unknown as HTMLElement;
const remote = createRoot(remoteElement);
remote.render(
  <React.StrictMode>
    <>extension</>
  </React.StrictMode>
);
