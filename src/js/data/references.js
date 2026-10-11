(function (root) {
  "use strict";

  const app = root.BufferLab;
  app.References = Object.freeze({
    thermoPbsTbs: Object.freeze({
      title: "Thermo Fisher BestProtocols：PBS 與 TBS 組成",
      url: "https://www.thermofisher.com/tw/zt/home/references/protocols/cell-and-tissue-analysis/protocols/icc-unfixed-cells-direct-method.html",
      status: "manufacturer-protocol"
    }),
    bioRadElectrophoresis: Object.freeze({
      title: "Bio-Rad Recipes for TAE and TBE Electrophoresis Buffers",
      url: "https://www.bio-rad.com/webroot/web/pdf/lsr/literature/Bulletin_6230.pdf",
      status: "manufacturer-protocol"
    }),
    thermoSsc: Object.freeze({
      title: "Thermo Fisher 20X SSC Product Information",
      url: "https://documents.thermofisher.com/TFS-Assets/LSG/manuals/sp_9762.pdf",
      status: "manufacturer-product-data"
    }),
    sigmaBuffers: Object.freeze({
      title: "MilliporeSigma Biological Buffers Selection Guide",
      url: "https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/marketing/global/documents/101/257/biological-buffers-selection-guide-ps3138en-ms.pdf",
      status: "manufacturer-technical-guide"
    }),
    pubChem: Object.freeze({
      title: "NIH PubChem Compound Database",
      url: "https://pubchem.ncbi.nlm.nih.gov/",
      status: "official-chemical-database"
    })
  });
})(window);
