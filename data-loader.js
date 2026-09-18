/* Lossless, compressed museum data for the GitHub upload edition. */
(function(root){
  'use strict';
  root.readMuseumJSON = async function(path) {
    const response = await fetch(path + '.gz');
    if (!response.ok) throw new Error('Museum data unavailable: HTTP ' + response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (typeof DecompressionStream !== 'function') throw new Error('Please use a current browser to load the museum data.');
      const decoded = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(decoded).json();
    }
    // Some hosts decode gzip in the HTTP transport before fetch returns it.
    return JSON.parse(new TextDecoder().decode(bytes));
  };
})(globalThis);
