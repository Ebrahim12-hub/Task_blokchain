"use strict";

let blindSignatures = require('blind-signatures');
let SpyAgency = require('./spyAgency.js').SpyAgency;

function makeDocument(coverName) {
  return `The bearer of this signed document, ${coverName}, has full diplomatic immunity.`;
}

function blind(msg, n, e) {
  return blindSignatures.blind({
    message: msg,
    N: n,
    E: e,
  });
}

function unblind(blindingFactor, sig, n) {
  return blindSignatures.unblind({
    signed: sig,
    N: n,
    r: blindingFactor,
  });
}

let agency = new SpyAgency();

let coverNames = [
  "John Doe", "Jane Smith", "James Bond", "Ethan Hunt", "Natasha Romanoff",
  "Jason Bourne", "Alicia Vikander", "Gabriel Logan", "Lara Croft", "Sam Fisher"
];

let documents = coverNames.map(name => makeDocument(name));

let blindDocs = [];
let blindingFactors = [];

documents.forEach(doc => {
  let { blinded, r } = blind(doc, agency.n, agency.e);
  blindDocs.push(blinded);
  blindingFactors.push(r);
});


agency.signDocument(blindDocs, (selected, verifyAndSign) => {
  let docsToSign = [];
  let factorsToSign = [];

  for (let i = 0; i < blindDocs.length; i++) {
    if (i === selected) {
      docsToSign.push(undefined);
      factorsToSign.push(undefined);
    } else {
      docsToSign.push(documents[i]);
      factorsToSign.push(blindingFactors[i]);
    }
  }

  let blindedSignature = verifyAndSign(factorsToSign, docsToSign);

  
  let finalSignature = unblind(blindingFactors[selected], blindedSignature, agency.n);

  let isValid = blindSignatures.verify({
    unblinded: finalSignature,
    N: agency.n,
    E: agency.e,
    message: documents[selected],
  });

  console.log(`التوقيع على المستند "${documents[selected]}" ${isValid ? "صحيح" : "غير صحيح"}`);
});
