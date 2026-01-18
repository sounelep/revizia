
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Document } from "../types";

const MODELS = {
  FLASH: 'gemini-3-flash-preview',
  FLASH_3: 'gemini-3-flash-preview',
  PRO_3: 'gemini-3-pro-preview',
  TTS: 'gemini-2.5-flash-preview-tts',
  IMAGE: 'gemini-2.5-flash-image'
};

const getAI = () => {
  console.log("API KEY =", import.meta.env.VITE_GEMINI_API_KEY);
  return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
};

const trackTokens = (usage: any) => {
  try {
    if (!usage) return;
    const total = usage.totalTokenCount || usage.total_tokens || 0;
    const tokens = typeof total === 'number' ? total : parseInt(total);
    if (!isNaN(tokens) && tokens > 0) {
      window.dispatchEvent(new CustomEvent('tokensUsed', { detail: tokens }));
    }
  } catch (e) { }
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> => {
  try { return await fn(); } catch (error: any) {
    if (retries > 0 && (error?.message?.includes("429") || error?.message?.includes("500") || error?.message?.includes("Failed to fetch"))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// --- GÉNÉRATION D'IMAGES ---

export const generateIllustration = async (prompt: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const pedagogicalPrompt = `
      Génère un schéma pédagogique ultra-précis pour un cours de mathématiques : ${prompt}.
      RÈGLES DE RIGUEUR :
      1. RIGUEUR GÉOMÉTRIQUE : Si un angle droit est mentionné, il DOIT être exactement de 90 degrés avec le symbole carré officiel.
      2. PRÉCISION DES SOMMETS : Si deux formes partagent un sommet (ex: triangle dans un triangle), le point de contact doit être parfait.
      3. NOTATIONS : Utilise des lettres majuscules (A, B, C...) pour nommer les points si pertinent.
      4. STYLE : Dessin technique épuré de manuel scolaire, fond blanc pur, traits noirs nets et épais, pas de couleurs superflues, pas d'ombres portées.
      L'image doit être simple, sans texte complexe inutile, uniquement le schéma géométrique exact.
    `;

    const response = await ai.models.generateContent({
      model: MODELS.IMAGE,
      contents: { parts: [{ text: pedagogicalPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  });
};

// --- NOUVEAU : GÉNÉRATION DE GÉOMÉTRIE SVG ---

export const generateGeometrySVG = async (prompt: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const systemPrompt = `Tu es un expert en géométrie et en code SVG. Ta tâche est de générer UNIQUEMENT le code source d'un fichier SVG (commençant par <svg> et finissant par </svg>) qui illustre parfaitement le concept géométrique demandé.
    
    RÈGLES DE RIGUEUR ABSOLUE :
    1. CALCULS : Calcule les coordonnées (x,y) avec précision mathématique.
    2. ANGLE DROIT : Si un angle droit est requis, dessine le symbole carré traditionnel (un petit polygone de 10-15px au sommet). L'angle doit être EXACTEMENT de 90°.
    3. SOMMETS PARTAGÉS : Si deux formes partagent un sommet, les coordonnées doivent être identiques au pixel près.
    4. LABELS : Ajoute des balises <text> pour nommer les sommets (A, B, C...) à proximité des points. Assure-toi que les textes ne sortent pas du cadre.
    5. STYLE : Stroke="black", stroke-width="2", fill="none" ou fill="rgba(79,70,229,0.1)".
    6. FORMAT : Utilise viewBox="-50 -50 500 500". Cette marge de 50 pixels tout autour est CRUCIALE pour éviter que le dessin ou les étiquettes ne soient coupés en haut ou sur les côtés. Le dessin principal doit tenir dans la zone centrale (coordonnées 0 à 400).
    7. RÉPONSE : Renvoie UNIQUEMENT le code SVG brut, sans balises de code markdown (\`\`\`svg), sans texte avant ou après.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: `Génère le code SVG précis pour : ${prompt}`,
      config: {
        systemInstruction: systemPrompt
      }
    });

    let svgCode = response.text || "";
    // Nettoyage au cas où le modèle ajoute du markdown
    svgCode = svgCode.replace(/```svg/g, "").replace(/```/g, "").trim();
    return svgCode.startsWith("<svg") ? svgCode : null;
  });
};

// --- ANALYSE DE DOCUMENT ---

export const analyzeDocument = async (base64?: string, text?: string, mimeType: string = 'image/jpeg') => {
  return withRetry(async () => {
    const ai = getAI();
    const parts: any[] = [{ text: "Analyse ce document de cours. Extrais un titre pertinent, un résumé synthétique, les points clés essentiels, les définitions importantes (lexique) et les formules ou dates clés." }];

    if (base64) {
      parts.push({ inlineData: { mimeType, data: base64 } });
    } else if (text) {
      parts.push({ text: `Texte du document : ${text}` });
    }

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            definitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING }
                },
                required: ["term", "definition"]
              }
            },
            formulas: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "summary", "keyPoints", "definitions", "formulas"]
        }
      }
    });
    trackTokens(response.usageMetadata);
    return JSON.parse(response.text || "{}");
  });
};

// --- GÉNÉRATION DE QUIZ ---

export const generateQuiz = async (content: string, count: number = 5) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Génère un quiz de ${count} questions basé sur ce contenu : ${content}. 
    Mélange questions à choix multiples (mcq) et questions ouvertes (free). 
    Si une question bénéficie d'une illustration visuelle (notamment en géométrie ou sciences), fournis un 'imagePrompt' descriptif et précis (ex: "Triangle ABC rectangle en A avec l'angle droit marqué").`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              hint: { type: Type.STRING },
              explanation: { type: Type.STRING },
              imagePrompt: { type: Type.STRING, description: "Prompt pour générer une image d'illustration si nécessaire" }
            },
            required: ["id", "type", "question", "correctAnswer", "hint", "explanation"]
          }
        }
      }
    });
    trackTokens(response.usageMetadata);
    return JSON.parse(response.text || "[]");
  });
};

// --- SERVICES LANGUES ---

export const generateLanguageExercise = async (language: string, theme: string, gradeLevel: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Génère un exercice de ${language} sur le thème "${theme}" pour un élève de ${gradeLevel}. JSON attendu.`;
    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentence: { type: Type.STRING },
            questionTarget: { type: Type.STRING },
            questionFr: { type: Type.STRING },
            translations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, trans: { type: Type.STRING } }, required: ["word", "trans"] } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const evaluateResponse = async (question: string, correctAnswer: string, userResponse: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `
    Tu es un professeur bienveillant. Évalue la réponse d'un élève.
    
    PARAMÈTRES d'INDULGENCE :
    1. VALIDE PAR MOTS-CLÉS : Si l'élève donne les 2 ou 3 mots-clés essentiels de la réponse correcte, considère-la comme "correcte" (status: "correct"), même s'il n'a pas fait de phrase complète ou s'il y a des fautes d'orthographe mineures.
    2. RÉPONSE LACUNAIRE : Si l'élève est sur la bonne voie mais qu'il manque un élément crucial, utilise "partial".
    3. PÉDAGOGIE : Dans le champ "feedback", écris TOUJOURS : "Correct ! La réponse complète est : [Réponse Idéale]" si la réponse est validée par mots-clés.
    
    DONNÉES :
    Question: ${question}
    Réponse attendue: ${correctAnswer}
    Réponse de l'élève: ${userResponse}
    `;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: "correct, partial, or incorrect" },
            feedback: { type: Type.STRING, description: "Explication pédagogique avec la réponse idéale incluse" },
            xpGained: { type: Type.NUMBER }
          },
          required: ["status", "feedback", "xpGained"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const elaboratePoint = async (point: string, context: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Explique plus en détail ce point de cours : "${point}". Utilise ce contexte : ${context}. 
    Sois clair, pédagogique et donne un exemple si possible. Termine par une phrase "💡 EN RÉSUMÉ" en gras.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
    });
    return response.text || point;
  });
};

export const explainQuizTopic = async (question: string, correctAnswer: string, context: string, userResponse?: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Question : ${question}\nRéponse correcte : ${correctAnswer}\n${userResponse ? `Réponse de l'élève : ${userResponse}\n` : ''}Contexte du cours : ${context}\n\nExplique pourquoi c'est la bonne réponse ou pourquoi l'élève s'est trompé. Sois pédagogue. Termine par une phrase "💡 EN RÉSUMÉ" en gras.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
    });
    return response.text || "";
  });
};

export const tutorChat = async (history: any[], message: string, context: string, mode: 'succinct' | 'detailed' = 'succinct', useSearch: boolean = false) => {
  return withRetry(async () => {
    const ai = getAI();
    const systemInstruction = `Tu es un tuteur personnel bienveillant. Ton but est d'aider l'élève à comprendre son cours.
    Contexte actuel du cours : ${context}.
    Si mode='succinct', réponds très brièvement. Si mode='detailed', fournis une explication structurée.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        tools: useSearch ? [{ googleSearch: {} }] : undefined
      }
    });
    trackTokens(response.usageMetadata);
    return {
      text: response.text || "",
      source: useSearch ? 'web' : 'doc',
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  });
};

export const analyzeUserSpeechPhonetically = async (language: string, transcript: string, expectedText?: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Analyse la prononciation de : "${transcript}". JSON attendu.`;
    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            score: { type: Type.NUMBER },
            phoneticTips: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sound: { type: Type.STRING }, tip: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const analyzeFreeSpeech = async (language: string, transcript: string, manualContext?: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const contextPrompt = manualContext ? `\n\nCONTEXTE SPÉCIFIQUE (Vérifie si ces mots apparaissent dans la transcription car ils peuvent être mal reconnus par l'outil de reconnaissance vocale) : \n${manualContext}` : "";

    const prompt = `Tu es un expert linguistique bilingue (Anglais/Français). Analyse cette transcription d'un élève parlant en ${language} : "${transcript}".${contextPrompt}
    
    CRITÈRES DE RÉPONSE :
    1. Fournis une correction grammaticale et lexicale complète.
    2. Pour chaque feedback (grammaire et phonétique), fournis TOUJOURS une version en Anglais ET une version en Français.
    3. Propose une liste de mots à pratiquer avec des conseils phonétiques bilingues.
    
    Structure JSON attendue :
    - correctedText: Le texte idéal corrigé.
    - grammarFeedbackEn: Explication grammaticale en Anglais.
    - grammarFeedbackFr: Explication grammaticale en Français.
    - phoneticFeedbackEn: Feedback sur l'accent en Anglais.
    - phoneticFeedbackFr: Feedback sur l'accent en Français.
    - score: Note sur 100.
    - wordsToPractice: [{ word: string, tipEn: string, tipFr: string }]`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: { type: Type.STRING },
            grammarFeedbackEn: { type: Type.STRING },
            grammarFeedbackFr: { type: Type.STRING },
            phoneticFeedbackEn: { type: Type.STRING },
            phoneticFeedbackFr: { type: Type.STRING },
            score: { type: Type.NUMBER },
            wordsToPractice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  tipEn: { type: Type.STRING },
                  tipFr: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const startRoleplay = async (language: string, theme: string, gradeLevel: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Crée un jeu de rôle en ${language} sur "${theme}". JSON attendu.`;
    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { type: Type.STRING },
            aiRole: { type: Type.STRING },
            userRole: { type: Type.STRING },
            firstLine: { type: Type.STRING },
            emotion: { type: Type.STRING },
            translations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, trans: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const continueRoleplay = async (language: string, history: any[], userInput: string, aiRole: string, scenario: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: [...history, { role: 'user', parts: [{ text: userInput }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            emotion: { type: Type.STRING },
            translations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, trans: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateEmotionalTTS = async (text: string, emotion: string, voiceName: string = 'Kore') => {
  const ai = getAI();
  const prompt = `Dis ceci avec un ton ${emotion} : ${text}`;
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

// --- FONCTIONS UTILITAIRES ---

export const generateTopicExplanation = async (topic: string, gradeLevel: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Explique "${topic}" à un élève de ${gradeLevel}. JSON attendu.
    ATTENTION : Si le sujet est trop vague ou imprécis (par exemple un seul mot sans verbe ni contexte suffisant comme 'Pythagore' sans précision 'théorème' ou 'biographie'), définis 'isAmbiguous' à true et laisse les autres champs vides.
    Pour chaque étape, si une illustration visuelle aiderait la compréhension (schéma, forme, concept visuel), fournis un 'imagePrompt' très descriptif (ex: "Angle droit de 90 degrés avec symbole carré au sommet A").`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAmbiguous: { type: Type.BOOLEAN, description: "True si le sujet est trop vague ou imprecis" },
            title: { type: Type.STRING },
            steps: {
              type: Type.ARRAY, items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING, description: "Prompt pour générer une image d'illustration si nécessaire" }
                }
              }
            },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const simplifyExplanation = async (currentExplanation: string, topic: string, gradeLevel: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODELS.FLASH_3,
    contents: `Simplifie cette explication pour un élève plus jeune : ${currentExplanation}`,
  });
  return response.text || currentExplanation;
};

export const generateTopicQuiz = async (topic: string, gradeLevel: string, count: number, mcqRatio: number) => {
  return generateQuiz(`Sujet : ${topic}, Niveau : ${gradeLevel}`, count);
};

export const extractWordsFromDocument = async (base64: string, mimeType: string = 'image/jpeg') => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODELS.FLASH_3,
    contents: { parts: [{ inlineData: { mimeType, data: base64 } }, { text: "Extrais uniquement une liste de mots ou termes importants de ce document pour une dictée ou un lexique. Renvoie uniquement un tableau JSON de chaînes de caractères." }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};

export const generateCoherentStory = async (words: string[]) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Écris un petit texte cohérent et simple utilisant tous ces mots : ${words.join(', ')}. Renvoie un tableau JSON de phrases.`;
    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  });
};

export const analyzeDictationError = async (expected: string, user: string, targetWords: string[]) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Compare la phrase attendue "${expected}" avec ce que l'élève a écrit "${user}". 
    Identifie les erreurs d'orthographe ou de ponctuation. Sois très précis sur les mots cibles : ${targetWords.join(', ')}.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              status: { type: Type.STRING, description: "correct, spelling, or punctuation" },
              explanation: { type: Type.STRING },
              correction: { type: Type.STRING },
              isTargetWord: { type: Type.BOOLEAN }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
};

export const integrateToRevisionCard = async (doc: Document, text: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Intègre cette nouvelle information dans la fiche "${doc.title}". Ne change pas l'ID ni la date. 
    Nouvelle info : ${text}. Fiche actuelle : ${JSON.stringify(doc)}. 
    Renvoie la fiche complète mise à jour en JSON.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || JSON.stringify(doc));
  });
};

export const processUserContribution = async (doc: Document, text: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Analyse cette note de l'élève : "${text}" pour la fiche "${doc.title}". 
    Détermine s'il s'agit d'une définition (term + definition), d'un point clé (text) ou d'une formule/date (text).
    Vérifie aussi si l'information est déjà présente dans la fiche : ${JSON.stringify(doc)}.
    Réponds au format JSON.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "keyPoint, definition, or formula" },
            content: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                term: { type: Type.STRING },
                definition: { type: Type.STRING }
              }
            },
            isDuplicate: { type: Type.BOOLEAN }
          },
          required: ["category", "content", "isDuplicate"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const mergeAnalysis = async (existingDoc: Document, newAnalysis: any) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Fusionne ces deux analyses de cours sans perdre d'information. 
    Analyse 1 : ${JSON.stringify(existingDoc)}. 
    Analyse 2 : ${JSON.stringify(newAnalysis)}. 
    Renvoie le résultat fusionné en JSON.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const compareWithTeacherSheet = async (doc: Document, teacherContent: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const prompt = `Compare la fiche de l'élève ("${doc.title}") avec le contenu du professeur fourni. 
    Identifie ce qui correspond (match) et ce qui manque ou est différent (missing). 
    Analyse chaque section de la fiche élève.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH_3,
      contents: { parts: [{ text: prompt }, { text: `Contenu Prof : ${teacherContent}` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            comparisonResults: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                definitions: { type: Type.ARRAY, items: { type: Type.STRING } },
                formulas: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};
