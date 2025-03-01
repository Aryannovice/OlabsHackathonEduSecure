/***** ▼▼▼ ADDED: Firebase Setup ▼▼▼ *****/
// 1. Your Firebase config (replace with your real values):
const firebaseConfig = {
  apiKey: "AIzaSyBDbAujfPPILlzd9ci1vlZBFyM_X6p8YW0",
  authDomain: "edulab-60539.firebaseapp.com",
  projectId: "edulab-60539",
  storageBucket: "edulab-60539.firebasestorage.app",
  messagingSenderId: "166673305795",
  appId: "1:166673305795:web:d42e9c672d338eb0fc9276"
};

// 2. Initialize Firebase
firebase.initializeApp(firebaseConfig);

// 3. Get Firestore reference
const db = firebase.firestore();

/***** EXAMPLE: Store a user doc (you can call this if needed) *****/
async function addOrUpdateUser() {
  try {
    const userId = "user123"; // In a real app, use the authenticated user's ID
    await db.collection("users").doc(userId).set({
      name: "Alice",
      email: "alice@example.com",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("User added/updated successfully!");
  } catch (error) {
    console.error("Error adding/updating user:", error);
  }
}

/***** EXAMPLE: Query user docs (you can call this if needed) *****/
async function getAllUsers() {
  try {
    const snapshot = await db.collection("users").get();
    snapshot.forEach(doc => {
      console.log(doc.id, " => ", doc.data());
    });
  } catch (error) {
    console.error("Error getting users:", error);
  }
}

/***** EXAMPLE: Store chat history (user question & AI response) *****/
async function storeChatHistory(question, answer) {
  try {
    await db.collection("chatHistory").add({
      question: question,
      answer: answer,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Chat history stored successfully!");
  } catch (error) {
    console.error("Error storing chat history:", error);
  }
}
/***** ▲▲▲ END: Firebase Setup & Example Functions ▲▲▲ *****/


/***** 1. API KEYS & ENDPOINTS *****/
// Replace ONLY these two lines:
const HF_API_KEY = "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";
const HF_IMAGE_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

// Everything else remains the same
const GEMINI_API_KEY = "AIzaSyD9kGnAUXcRa8KH8czjd-6aB0qsutVlrVQ";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const REVERIE_API_KEY = "db9bd468ee2d7cc1272433c69a125ab1c730f0be";
const REVERIE_APP_ID  = "dev.prabhakarpratham02";
const REVERIE_API_URL = "https://revapi.reverieinc.com/";

/***** 2. HTML Elements *****/
const userInput          = document.getElementById("userInput");
const aiResponse         = document.getElementById("aiResponse");
const askButton          = document.getElementById("askButton");
const toggleRecordingBtn = document.getElementById("toggleRecordingBtn");
const toggleSpeakBtn     = document.getElementById("toggleSpeakBtn");
const pauseSpeakBtn      = document.getElementById("pauseSpeakBtn"); // NEW
const fileInput          = document.getElementById("fileInput");
const processFileBtn     = document.getElementById("processFileBtn");
const inputLangSelect    = document.getElementById("inputLang");
const outputLangSelect   = document.getElementById("outputLang");

// New Elements for Image
const simplifyPromptBtn  = document.getElementById("simplifyPromptBtn");
const imagePrompt        = document.getElementById("imagePrompt");
const generateImageBtn   = document.getElementById("generateImageBtn");
const imageContainer     = document.getElementById("imageContainer");

// Accessibility
const disabilitySelect      = document.getElementById("disabilitySelect");
const applyAccessibilityBtn = document.getElementById("applyAccessibilityBtn");
let selectedDisability = "";

// Quiz Elements
const generateQuizBtn  = document.getElementById("generateQuizBtn");
const quizContainer    = document.getElementById("quizContainer");
const quizLangSelect   = document.getElementById("quizLangSelect");
let currentQuiz        = null; 

/***** ADAPTIVE QUIZ ARRAYS *****/
let missedQuestionsArr = [];
let masteredQuestionsArr = [];

/* 
// The second definitions are commented out to avoid 
// "Identifier ... has already been declared" errors:

// let missedQuestionsArr = [];
// let masteredQuestionsArr = [];
*/

/***** NEW: MediaRecorder for Non-English STT *****/
let recognition;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let isRecordingReverie = false;

// Reverie TTS
let isSpeaking = false;
let currentAudio = null;

/***** 3. Accessibility Settings *****/
applyAccessibilityBtn.addEventListener("click", () => {
  selectedDisability = disabilitySelect.value; 
  switch (selectedDisability) {
    case "downSyndrome":
      document.body.style.fontSize = "1.3em";
      alert("🟢 Down Syndrome Mode Activated");
      break;
    case "dyslexia":
      document.body.style.fontFamily = "'OpenDyslexic', Arial, sans-serif";
      alert("🟢 Dyslexia Mode Activated");
      break;
    case "hearingImpaired":
      alert("🟢 Hearing Impaired Mode Activated");
      break;
    case "visualImpaired":
      document.body.style.backgroundColor = "#000";
      document.body.style.color = "#fff";
      document.body.style.fontSize = "1.4em";
      alert("🟢 Visual Impaired Mode Activated");
      break;
    case "adhd":
      alert("🟢 ADHD Mode Activated");
      break;
    default:
      document.body.style = "";
      alert("⚪ Default Mode Activated");
  }
});

/***** 4. Speech Recognition (English + Reverie STT for Non-English) *****/
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US"; 

  recognition.onresult = (event) => {
    userInput.value = event.results[0][0].transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    isRecording = false;
    toggleRecordingBtn.textContent = "Start Recording";
  };
} else {
  alert("Speech recognition is not supported by your browser.");
}

toggleRecordingBtn.addEventListener("click", async () => {
  const chosenLang = inputLangSelect.value;

  if (chosenLang === "en" || chosenLang === "auto") {
    if (!recognition) {
      alert("Speech recognition not supported. Please try a different approach.");
      return;
    }
    if (!isRecording) {
      recognition.start();
      isRecording = true;
      toggleRecordingBtn.textContent = "Stop Recording";
    } else {
      recognition.stop();
      isRecording = false;
      toggleRecordingBtn.textContent = "Start Recording";
    }
  } else {
    // Non-English => record via MediaRecorder => Reverie STT
    if (!isRecordingReverie) {
      try {
        let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          let blob = new Blob(recordedChunks, { type: "audio/wav" });
          try {
            let sttText = await sendToReverieSTT(blob, chosenLang);
            userInput.value = sttText;
          } catch (err) {
            console.error("Reverie STT error:", err);
            alert("Error transcribing audio. See console for details.");
          }
        };

        mediaRecorder.start();
        isRecordingReverie = true;
        toggleRecordingBtn.textContent = "Stop Recording";
      } catch (err) {
        console.error("Error accessing mic:", err);
        alert("Could not access microphone. Check permissions.");
      }
    } else {
      mediaRecorder.stop();
      isRecordingReverie = false;
      toggleRecordingBtn.textContent = "Start Recording";
    }
  }
});

/***** Reverie STT Helper for Non-English *****/
async function sendToReverieSTT(audioBlob, langCode) {
  const supportedReverieLangs = {
    en: "en",
    hi: "hi",
    bn: "bn",
    ml: "ml",
    ta: "ta",
    te: "te",
    gu: "gu",
    mr: "mr",
    kn: "kn",
    or: "or",
    pa: "pa",
    as: "as",
    ur: "ur",
    ma: "ma",
    sa: "sa",
    sd: "sd",
    ks: "ks",
    mni: "mni",
    ne: "ne",
    kok: "kok"
  };
  const reverieLang = supportedReverieLangs[langCode] || "hi";

  let formData = new FormData();
  formData.append("audio_file", audioBlob, "recording.wav");

  let response = await fetch(REVERIE_API_URL, {
    method: "POST",
    headers: {
      "REV-API-KEY": REVERIE_API_KEY,
      "REV-APP-ID": REVERIE_APP_ID,
      "REV-APPNAME": "stt_file",
      "src_lang": reverieLang,
      "domain": "generic",
      "format": "wav"
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Reverie STT error: ${response.status} - ${response.statusText}`);
  }

  let data = await response.json();
  console.log("Reverie STT data:", data);
  return data.text || data.transcript || "Could not parse STT text.";
}

/***** 5. File Processing (Text only) *****/
processFileBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("Select a file first.");
    return;
  }

  if (file.type === "text/plain") {
    const reader = new FileReader();
    reader.onload = (e) => {
      userInput.value = e.target.result;
    };
    reader.readAsText(file);
  } else {
    alert("Only text files are supported.");
  }
});

/***** 6. Ask AI (Gemini) *****/
askButton.addEventListener("click", async () => {
  const question = userInput.value.trim();
  if (!question) {
    alert("Enter or upload a question.");
    return;
  }

  aiResponse.value = "Processing your question...";

  try {
    const geminiText = await getTeacherLikeAnswer(question, outputLangSelect.value);

    // Remove ALL asterisks
    const sanitizedText = geminiText.replace(/\*/g, "");
    aiResponse.value = sanitizedText;

    // ▼▼▼ ADDED: Store question & AI response in Firestore ▼▼▼
    await storeChatHistory(question, sanitizedText);

  } catch (err) {
    console.error("Error calling getTeacherLikeAnswer:", err);
    aiResponse.value = "❌ Error generating response. Please try again.";
  }
});

async function getTeacherLikeAnswer(question, outputLang) {
  // We keep 6 main languages for demonstration, 
  // or expand to 22 if needed:
  const langNameMap = {
    en: "English",
    hi: "Hindi",
    bn: "Bengali",
    ml: "Malayalam",
    ta: "Tamil",
    te: "Telugu"
    // gu: "Gujarati", mr: "Marathi", etc. can be added similarly
  };

  const languageName = langNameMap[outputLang] || "English";

  let disabilityNote = "";
  switch (selectedDisability) {
    case "downSyndrome":
      disabilityNote = " Use simpler language and short sentences for Down Syndrome learners.";
      break;
    case "dyslexia":
      disabilityNote = " Use a clear, easy-to-read structure suitable for Dyslexia.";
      break;
    case "hearingImpaired":
      disabilityNote = " Provide context that doesn't rely on hearing-based cues.";
      break;
    case "visualImpaired":
      disabilityNote = " Provide descriptive explanations that can be understood via screen readers.";
      break;
    case "adhd":
      disabilityNote = " Keep the explanation concise and focused for ADHD learners.";
      break;
    default:
      disabilityNote = "";
  }

  const teacherPrompt = `Explain the following question in detail like a teacher in ${languageName}:${disabilityNote}\n\n${question}`;
  console.log("Teacher Prompt:", teacherPrompt);

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: teacherPrompt }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = `Error: ${response.status} - ${response.statusText}`;
    console.error(errText);
    return errText;
  }

  const data = await response.json();
  console.log("Gemini API JSON:", data);

  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No valid response from AI.";
  return answer;
}

/***** 7. Reverie TTS Integration *****/
toggleSpeakBtn.addEventListener("click", () => {
  const text = aiResponse.value.trim();
  if (!text) {
    alert("No AI response to speak.");
    return;
  }

  if (!isSpeaking) {
    speakReverieTTS(text, outputLangSelect.value);
  } else {
    stopReverieTTS();
  }
});

async function speakReverieTTS(text, languageCode) {
  // We keep 6 main languages here for demonstration, 
  // or expand if Reverie supports them:
  const speakerMap = {
    en: "en_female",
    hi: "hi_female",
    bn: "bn_female",
    ml: "ml_female",
    ta: "ta_female",
    te: "te_female"
  };
  const speaker = speakerMap[languageCode] || "en_female";

  toggleSpeakBtn.textContent = "Stop Speaking";
  isSpeaking = true;

  try {
    // If you want to break text by sentences => chunk fetch => reduce latency
    const response = await fetch(REVERIE_API_URL, {
      method: "POST",
      headers: {
        "REV-API-KEY": REVERIE_API_KEY,
        "REV-APP-ID": REVERIE_APP_ID,
        "REV-APPNAME": "tts",
        "speaker": speaker,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: [text],
        speed: 1,
        pitch: 0,
        format: "WAV"
      })
    });

    if (!response.ok) {
      throw new Error(`Reverie TTS Error: ${response.status} - ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl  = URL.createObjectURL(audioBlob);

    currentAudio = new Audio(audioUrl);
    currentAudio.play();

    currentAudio.onended = () => {
      isSpeaking = false;
      toggleSpeakBtn.textContent = "Start Speaking";
      currentAudio = null;
    };

  } catch (error) {
    console.error("Reverie TTS error:", error);
    alert("Error generating speech. Please try again.");
    isSpeaking = false;
    toggleSpeakBtn.textContent = "Start Speaking";
  }
}

function stopReverieTTS() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  isSpeaking = false;
  toggleSpeakBtn.textContent = "Start Speaking";
}

/***** ▼▼▼ NEW: Pause/Resume TTS Button ▼▼▼ *****/
let pausedTime = 0;

pauseSpeakBtn.addEventListener("click", () => {
  if (!currentAudio) {
    alert("No speech is playing right now.");
    return;
  }
  if (!currentAudio.paused) {
    // Pause
    pausedTime = currentAudio.currentTime;
    currentAudio.pause();
    pauseSpeakBtn.textContent = "Resume Speech";
    console.log("Speech paused at:", pausedTime);
  } else {
    // Resume
    currentAudio.currentTime = pausedTime;
    currentAudio.play();
    pauseSpeakBtn.textContent = "Pause Speech";
    console.log("Speech resumed from:", pausedTime);
  }
});
/***** ▲▲▲ End Pause/Resume TTS Button ▲▲▲ *****/

/***** 8. Simplify Prompt for Student-Friendly Image Generation *****/
simplifyPromptBtn.addEventListener("click", async () => {
  const text = aiResponse.value.trim();
  if (!text) {
    alert("No AI response to simplify!");
    return;
  }

  imagePrompt.value = "Simplifying prompt for a student-friendly, textbook-style image...";

  try {
    const shortPrompt = await getStudentFriendlyImagePrompt(text);
    imagePrompt.value = shortPrompt;
  } catch (err) {
    console.error("Error simplifying prompt:", err);
    imagePrompt.value = "❌ Error simplifying prompt. Try again.";
  }
});

async function getStudentFriendlyImagePrompt(longText) {
  let disabilityNote = "";
  switch (selectedDisability) {
    case "downSyndrome":
      disabilityNote = " Use simpler language and short sentences for Down Syndrome learners.";
      break;
    case "dyslexia":
      disabilityNote = " Use a clear, dyslexia-friendly approach.";
      break;
    case "hearingImpaired":
      disabilityNote = " Make sure it doesn't rely on sound-based explanations.";
      break;
    case "visualImpaired":
      disabilityNote = " Make it descriptive for screen readers, focusing on visual elements carefully explained.";
      break;
    case "adhd":
      disabilityNote = " Keep it concise and visually engaging.";
      break;
    default:
      disabilityNote = "";
  }

  const prompt = `
Create a short, direct image prompt that is relatable to students and includes a good textbook-style example. 
It should clearly illustrate the main concept in a way students can easily understand.${disabilityNote}
Base it on the following text:

${longText}
`;

  console.log("Simplify Prompt:", prompt);

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = `Error: ${response.status} - ${response.statusText}`;
    console.error(errText);
    return errText;
  }

  const data = await response.json();
  console.log("Gemini Simplify Prompt JSON:", data);

  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No valid short prompt.";
  return answer.replace(/\*/g, "");
}

/***** 9. Generate Image (Hugging Face) *****/
generateImageBtn.addEventListener("click", async () => {
  const prompt = imagePrompt.value.trim();
  if (!prompt) {
    alert("No simplified prompt to convert to image!");
    return;
  }

  imageContainer.innerHTML = `<p>Generating image from prompt...</p>`;

  try {
    const response = await fetch(HF_IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status} - ${response.statusText}`);
    }

    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    imageContainer.innerHTML = `<img src="${imageUrl}" alt="Generated Image" style="max-width: 300px;" />`;

    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "Download Image";
    downloadBtn.style.marginTop = "10px";
    downloadBtn.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "generated-image.png";
      link.click();
    });
    imageContainer.appendChild(downloadBtn);

  } catch (error) {
    console.error("Error generating image:", error);
    imageContainer.innerHTML = `<p style="color: red;">Error generating image: ${error.message}</p>`;
  }
});

/***** 10. DYNAMIC QUIZ GENERATION *****/
// We keep the top-level arrays declared once at the top
// let missedQuestionsArr = [];
// let masteredQuestionsArr = [];

generateQuizBtn.addEventListener("click", async () => {
  const topic = userInput.value.trim();
  if (!topic) {
    alert("⚠️ Enter a topic or question first.");
    return;
  }

  quizContainer.innerHTML = "Generating quiz...";

  try {
    const quizLang = quizLangSelect.value;
    const quizData = await getQuizFromGemini(topic, quizLang);
    if (quizData && quizData.questions) {
      // Clear previous performance data
      missedQuestionsArr = [];
      masteredQuestionsArr = [];
      currentQuiz = quizData;
      displayQuiz(currentQuiz);
    } else {
      quizContainer.innerHTML = `<p style="color:red">❌ Could not parse quiz data. Check the console.</p>`;
    }
  } catch (err) {
    console.error("Error generating quiz:", err);
    quizContainer.innerHTML = `<p style="color:red">❌ Error generating quiz. Please try again.</p>`;
  }
});

async function getQuizFromGemini(topic, quizLang) {
  let disabilityNote = "";
  switch (selectedDisability) {
    case "downSyndrome":
      disabilityNote = " Use simpler language and short sentences.";
      break;
    case "dyslexia":
      disabilityNote = " Use a clear, dyslexia-friendly approach.";
      break;
    case "hearingImpaired":
      disabilityNote = " Avoid relying on hearing-based cues.";
      break;
    case "visualImpaired":
      disabilityNote = " Provide descriptive text for screen readers.";
      break;
    case "adhd":
      disabilityNote = " Keep it concise and visually engaging.";
      break;
    default:
      disabilityNote = "";
  }

  // Updated to include all 22 Indian languages
  const langNameMap = {
    en: "English",
    hi: "Hindi",
    bn: "Bengali",
    ml: "Malayalam",
    ta: "Tamil",
    te: "Telugu",
    gu: "Gujarati",
    mr: "Marathi",
    kn: "Kannada",
    or: "Odia",
    pa: "Punjabi",
    as: "Assamese",
    ur: "Urdu",
    ma: "Maithili",
    sa: "Sanskrit",
    sd: "Sindhi",
    ks: "Kashmiri",
    mni: "Manipuri",
    ne: "Nepali",
    kok: "Konkani"
  };
  const quizLangName = langNameMap[quizLang] || "English";

  const quizPrompt = `
  Create exactly 10 multiple-choice questions in ${quizLangName} about the topic: "${topic}".
  Use real-life or practical scenarios for each question to help illustrate the concept. 
  For each question, provide:
    "question": A short question 
    "choices": An array of possible answers (3 or 4 options)
    "answer": The correct answer index or text
    "explanation": A brief explanation of the correct answer (in a real-life context)
  Make it relatable to students, follow textbook-style examples, and output valid JSON only.
  ${disabilityNote}
  Structure:
  {
    "questions": [
      {
        "question": "...",
        "choices": ["...","...","..."],
        "answer": 0,
        "explanation": "short explanation with real-life scenario"
      },
      ...
    ]
  }
  `;

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: quizPrompt }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = `Quiz Error: ${response.status} - ${response.statusText}`;
    console.error(errText);
    return null;
  }

  const data = await response.json();
  console.log("Gemini Quiz JSON:", data);

  let quizText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("Raw quiz text from Gemini:", quizText);

  quizText = quizText.replace(/```(\w+)?/g, "").trim();

  try {
    const quizObj = JSON.parse(quizText);
    return quizObj;
  } catch (parseErr) {
    console.error("Failed to parse quiz JSON:", parseErr);
    return null;
  }
}

function displayQuiz(quizData) {
  quizContainer.innerHTML = "";

  quizData.questions.forEach((q, qIndex) => {
    const questionDiv = document.createElement("div");
    questionDiv.style.marginBottom = "1em";

    const questionP = document.createElement("p");
    questionP.textContent = `Q${qIndex + 1}: ${q.question}`;
    questionDiv.appendChild(questionP);

    q.choices.forEach((choice, cIndex) => {
      const label = document.createElement("label");
      label.style.display = "block";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `quizQ${qIndex}`;
      radio.value = cIndex;

      label.appendChild(radio);
      label.appendChild(document.createTextNode(` ${choice}`));
      questionDiv.appendChild(label);
    });

    quizContainer.appendChild(questionDiv);
  });

  const checkBtn = document.createElement("button");
  checkBtn.textContent = "Check Answers";
  checkBtn.addEventListener("click", () => checkQuizAnswers(quizData));
  quizContainer.appendChild(checkBtn);
}

function checkQuizAnswers(quizData) {
  let correctCount = 0;
  let explanationsHTML = "<h3>Explanations:</h3>";

  quizData.questions.forEach((q, qIndex) => {
    const radios = document.getElementsByName(`quizQ${qIndex}`);
    let selectedIndex = -1;
    radios.forEach((r) => {
      if (r.checked) {
        selectedIndex = parseInt(r.value);
      }
    });

    let isCorrect = false;
    if (typeof q.answer === "number") {
      if (selectedIndex === q.answer) {
        isCorrect = true;
        correctCount++;
      }
    } else {
      if (selectedIndex >= 0 && q.choices[selectedIndex] === q.answer) {
        isCorrect = true;
        correctCount++;
      }
    }

    const explanation = q.explanation || "No explanation provided.";
    explanationsHTML += `<p><strong>Q${qIndex + 1}:</strong> ${
      isCorrect ? "<span style='color:green'>Correct!</span>" : "<span style='color:red'>Incorrect!</span>"
    }<br>Explanation: ${explanation}</p>`;

    if (!isCorrect) {
      missedQuestionsArr.push(q.question);
    } else {
      masteredQuestionsArr.push(q.question);
    }
  });

  const total = quizData.questions.length;
  alert(`You got ${correctCount} out of ${total} correct!`);

  quizContainer.innerHTML += explanationsHTML;

  const adaptiveBtn = document.createElement("button");
  adaptiveBtn.textContent = "Generate Next Adaptive Quiz";
  adaptiveBtn.style.marginTop = "1em";
  adaptiveBtn.addEventListener("click", generateAdaptiveQuiz);
  quizContainer.appendChild(adaptiveBtn);
}

async function generateAdaptiveQuiz() {
  if (missedQuestionsArr.length === 0 && masteredQuestionsArr.length === 0) {
    alert("No performance data found. Please attempt a quiz first.");
    return;
  }

  quizContainer.innerHTML = "Generating adaptive quiz...";

  try {
    let missedList = missedQuestionsArr.map((q, i) => `Missed topic #${i+1}: ${q}`).join("\n");
    let masteredList = masteredQuestionsArr.map((q, i) => `Mastered topic #${i+1}: ${q}`).join("\n");

    let adaptivePrompt = `
We are generating another set of 10 multiple-choice questions. 
Focus more on these missed topics or subtopics:
${missedList}

The user got these topics correct:
${masteredList}

For the correct topics, produce fewer but higher difficulty questions. 
For the missed topics, produce more coverage or simpler approach. 
Return valid JSON with "questions": [...] each having question, choices, answer, explanation.
    `;

    let quizLang = quizLangSelect.value;
    // Updated to handle all 22 Indian languages for the adaptive quiz too
    const langNameMap = {
      en: "English",
      hi: "Hindi",
      bn: "Bengali",
      ml: "Malayalam",
      ta: "Tamil",
      te: "Telugu",
      gu: "Gujarati",
      mr: "Marathi",
      kn: "Kannada",
      or: "Odia",
      pa: "Punjabi",
      as: "Assamese",
      ur: "Urdu",
      ma: "Maithili",
      sa: "Sanskrit",
      sd: "Sindhi",
      ks: "Kashmiri",
      mni: "Manipuri",
      ne: "Nepali",
      kok: "Konkani"
    };
    let quizLangName = langNameMap[quizLang] || "English";

    let response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: adaptivePrompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      quizContainer.innerHTML = `<p style="color:red">❌ Could not generate adaptive quiz. Status: ${response.status}</p>`;
      return;
    }

    let data = await response.json();
    console.log("Adaptive quiz JSON:", data);

    let quizText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    quizText = quizText.replace(/```(\w+)?/g, "").trim();

    let quizObj;
    try {
      quizObj = JSON.parse(quizText);
    } catch (e) {
      console.error("Adaptive quiz parse error:", e);
      quizContainer.innerHTML = `<p style="color:red">❌ Could not parse adaptive quiz data. See console.</p>`;
      return;
    }

    if (quizObj && quizObj.questions) {
      currentQuiz = quizObj;
      missedQuestionsArr = [];
      masteredQuestionsArr = [];

      displayQuiz(currentQuiz);
    } else {
      quizContainer.innerHTML = `<p style="color:red">❌ No questions in adaptive quiz data.</p>`;
    }

  } catch (err) {
    console.error("Error generating adaptive quiz:", err);
    quizContainer.innerHTML = `<p style="color:red">❌ Error generating adaptive quiz. Please try again.</p>`;
  }
}
