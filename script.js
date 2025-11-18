document.addEventListener('DOMContentLoaded', () => {
    const quizSelectionContainer = document.getElementById('quiz-selection-container');
    const quizGameContainer = document.getElementById('quiz-game-container');
    const quizCategoriesElement = document.getElementById('quiz-categories');
    const quizListElement = document.getElementById('quiz-list');
    const backToCategoriesButton = document.getElementById('back-to-categories');

    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsList = document.getElementById('search-results-list');
    const backFromSearchButton = document.getElementById('back-from-search');

    const questionTextElement = document.getElementById('question-text');
    const answerButtonsElement = document.getElementById('answer-buttons');
    const feedbackContainer = document.getElementById('feedback-container');
    const nextButton = document.getElementById('next-button');

    let quizManifest = [];
    let currentQuizData;
    let currentQuestionIndex = 0;
    let questionsToRetake = []; // Stores questions answered incorrectly

    let allQuizzesQuestions = []; // Stores all questions from all quizzes for searching

    // Scoring and Results Variables
    let currentScore = 0;
    let correctAnswersCount = 0;
    let incorrectAnswersCount = 0;
    let quizResults = []; // Stores details of incorrectly answered questions
    let currentQuizPath = ''; // To identify the current quiz for local storage

    // Function to shuffle an array (Fisher-Yates algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function loadQuizManifest() {
        try {
            const response = await fetch('quiz_manifest.json');
            quizManifest = await response.json();
            await preloadAllQuizData(); // Preload all quiz data for searching
            displayQuizCategories();
        } catch (error) {
            console.error('Error loading quiz manifest:', error);
            quizCategoriesElement.textContent = 'Error loading quiz categories. Please try again later.';
        }
    }

    async function preloadAllQuizData() {
        allQuizzesQuestions = []; // Clear previous data
        const fetchPromises = quizManifest.quizzes.map(async (quiz) => {
            try {
                const response = await fetch(quiz.path);
                const data = await response.json();
                data.quiz.questions.forEach(question => {
                    allQuizzesQuestions.push({
                        ...question,
                        quizCategory: quiz.category,
                        quizName: quiz.name
                    });
                });
            } catch (error) {
                console.error(`Error preloading quiz data for ${quiz.path}:`, error);
            }
        });
        await Promise.all(fetchPromises);
        console.log('All quiz data preloaded:', allQuizzesQuestions);
    }

    function displayQuizCategories() {
        quizSelectionContainer.classList.remove('hide');
        quizGameContainer.classList.add('hide');
        backToCategoriesButton.classList.add('hide');
        searchResultsContainer.classList.add('hide'); // Hide search results
        backFromSearchButton.classList.add('hide'); // Hide back from search button

        quizCategoriesElement.innerHTML = '';
        quizListElement.innerHTML = '';
        quizCategoriesElement.classList.remove('hide'); // Ensure categories are visible
        quizListElement.classList.remove('hide'); // Ensure quiz list is visible (though it will be empty initially)

        const categories = [...new Set(quizManifest.quizzes.map(quiz => quiz.category))];

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = 'Select a Category';
        quizCategoriesElement.appendChild(categoryTitle);

        categories.forEach(category => {
            const button = document.createElement('button');
            button.textContent = category;
            button.classList.add('btn', 'category-btn');
            button.addEventListener('click', () => displayQuizzesInCategory(category));
            quizCategoriesElement.appendChild(button);
        });
    }

    function displayQuizzesInCategory(category) {
        quizCategoriesElement.classList.add('hide');
        quizListElement.classList.remove('hide');
        backToCategoriesButton.classList.remove('hide');
        searchResultsContainer.classList.add('hide'); // Hide search results
        backFromSearchButton.classList.add('hide'); // Hide back from search button

        quizListElement.innerHTML = '';

        const quizTitle = document.createElement('h2');
        quizTitle.textContent = `Quizzes in ${category}`;
        quizListElement.appendChild(quizTitle);

        const quizzesInCategory = quizManifest.quizzes.filter(quiz => quiz.category === category);

        quizzesInCategory.forEach(quiz => {
            const quizItemDiv = document.createElement('div');
            quizItemDiv.classList.add('quiz-item'); // Add a class for styling

            const button = document.createElement('button');
            button.textContent = quiz.name;
            button.classList.add('btn', 'quiz-btn');
            button.addEventListener('click', () => startQuiz(quiz.path));
            quizItemDiv.appendChild(button);

            const savedResults = localStorage.getItem(`quizResults_${quiz.path}`);
            if (savedResults) {
                const results = JSON.parse(savedResults);
                const scoreSpan = document.createElement('span');
                scoreSpan.classList.add('quiz-score-summary');
                scoreSpan.textContent = `Last Score: ${results.score}/${results.totalQuestions}`;
                quizItemDiv.appendChild(scoreSpan);
            }
            quizListElement.appendChild(quizItemDiv);
        });
    }

    async function startQuiz(quizPath) {
        try {
            const response = await fetch(quizPath);
            const data = await response.json();
            currentQuizData = data.quiz.questions;
            shuffleArray(currentQuizData); // Shuffle questions for the selected quiz
            currentQuestionIndex = 0;
            questionsToRetake = [];
            
            // Reset scoring for new quiz
            currentScore = 0;
            correctAnswersCount = 0;
            incorrectAnswersCount = 0;
            quizResults = [];
            currentQuizPath = quizPath;

            quizSelectionContainer.classList.add('hide');
            quizGameContainer.classList.remove('hide');
            displayQuestion();
        } catch (error) {
            console.error('Error loading quiz:', error);
            questionTextElement.textContent = 'Error loading quiz. Please try again later.';
        }
    }

    function displayQuestion() {
        resetState();
        let questionToDisplay;

        if (questionsToRetake.length > 0) {
            questionToDisplay = questionsToRetake[0];
        } else if (currentQuestionIndex < currentQuizData.length) {
            questionToDisplay = currentQuizData[currentQuestionIndex];
        } else {
            displayQuizResults();
            return;
        }

        questionTextElement.textContent = questionToDisplay.content.text;

        if (questionToDisplay.type === 'multichoice-multi') {
            questionToDisplay.content.answers.forEach((answer, index) => {
                const label = document.createElement('label');
                label.classList.add('checkbox-label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = `question-${questionToDisplay.number}`;
                checkbox.value = index;
                label.appendChild(checkbox);
                label.append(answer.text);
                answerButtonsElement.appendChild(label);
            });
            const submitButton = document.createElement('button');
            submitButton.textContent = 'Submit Answer';
            submitButton.classList.add('btn', 'submit-multi-btn');
            submitButton.addEventListener('click', () => submitMultiChoiceAnswer(questionToDisplay));
            answerButtonsElement.appendChild(submitButton);
        } else {
            questionToDisplay.content.answers.forEach(answer => {
                const button = document.createElement('button');
                button.textContent = answer.text;
                button.classList.add('btn');
                if (answer.is_correct) {
                    button.dataset.correct = true;
                }
                button.addEventListener('click', (e) => selectAnswer(e, questionToDisplay));
                answerButtonsElement.appendChild(button);
            });
        }
    }

    function resetState() {
        nextButton.classList.add('hide');
        feedbackContainer.textContent = '';
        feedbackContainer.classList.remove('correct-feedback', 'incorrect-feedback');
        while (answerButtonsElement.firstChild) {
            answerButtonsElement.removeChild(answerButtonsElement.firstChild);
        }
    }

    function selectAnswer(e, questionToDisplay) {
        const selectedButton = e.target;
        const isCorrect = selectedButton.dataset.correct === 'true';

        Array.from(answerButtonsElement.children).forEach(button => {
            button.disabled = true;
            if (button.dataset.correct === 'true') {
                button.classList.add('correct');
            }
        });

        if (isCorrect) {
            feedbackContainer.textContent = 'Correct!';
            feedbackContainer.classList.add('correct-feedback');
            currentScore++;
            correctAnswersCount++;
            if (questionsToRetake.length > 0 && questionsToRetake[0] === questionToDisplay) {
                questionsToRetake.shift();
            } else {
                currentQuestionIndex++;
            }
        } else {
            feedbackContainer.textContent = 'Incorrect. Try again!';
            feedbackContainer.classList.add('incorrect-feedback');
            incorrectAnswersCount++;
            quizResults.push({
                question: questionToDisplay.content.text,
                selectedAnswer: selectedButton.textContent,
                correctAnswer: questionToDisplay.content.answers.find(ans => ans.is_correct).text
            });
            if (!questionsToRetake.includes(questionToDisplay)) {
                questionsToRetake.push(questionToDisplay);
            }
        }
        nextButton.classList.remove('hide');
    }

    function submitMultiChoiceAnswer(questionToDisplay) {
        const checkboxes = Array.from(answerButtonsElement.querySelectorAll('input[type="checkbox"]'));
        const submitButton = answerButtonsElement.querySelector('.submit-multi-btn');

        let allCorrectSelected = true;
        let anyIncorrectSelected = false;

        questionToDisplay.content.answers.forEach((answer, index) => {
            const checkbox = checkboxes[index];
            const isSelected = checkbox.checked;

            if (answer.is_correct && !isSelected) {
                allCorrectSelected = false;
            }
            if (!answer.is_correct && isSelected) {
                anyIncorrectSelected = true;
            }

            checkbox.disabled = true;
            if (answer.is_correct) {
                checkbox.parentNode.classList.add('correct');
            }
            if (!answer.is_correct && isSelected) {
                checkbox.parentNode.classList.add('incorrect');
            }
        });

        if (submitButton) {
            submitButton.disabled = true;
        }

        if (allCorrectSelected && !anyIncorrectSelected) {
            feedbackContainer.textContent = 'Correct!';
            feedbackContainer.classList.add('correct-feedback');
            currentScore++;
            correctAnswersCount++;
            if (questionsToRetake.length > 0 && questionsToRetake[0] === questionToDisplay) {
                questionsToRetake.shift();
            } else {
                currentQuestionIndex++;
            }
        } else {
            feedbackContainer.textContent = 'Incorrect. Try again!';
            feedbackContainer.classList.add('incorrect-feedback');
            incorrectAnswersCount++;
            const correctAnswers = questionToDisplay.content.answers
                .filter(ans => ans.is_correct)
                .map(ans => ans.text)
                .join(', ');
            const selectedAnswers = questionToDisplay.content.answers
                .filter((ans, index) => checkboxes[index].checked)
                .map(ans => ans.text)
                .join(', ');

            quizResults.push({
                question: questionToDisplay.content.text,
                selectedAnswer: selectedAnswers || 'No answer selected',
                correctAnswer: correctAnswers
            });
            if (!questionsToRetake.includes(questionToDisplay)) {
                questionsToRetake.push(questionToDisplay);
            }
        }
        nextButton.classList.remove('hide');
    }

    function saveQuizResults() {
        const results = {
            score: currentScore,
            totalQuestions: currentQuizData.length,
            correct: correctAnswersCount,
            incorrect: incorrectAnswersCount,
            details: quizResults // Array of incorrect answers
        };
        localStorage.setItem(`quizResults_${currentQuizPath}`, JSON.stringify(results));
    }

    function displayQuizResults() {
        saveQuizResults(); // Save results before displaying

        questionTextElement.textContent = 'Quiz Completed!';
        answerButtonsElement.innerHTML = '';
        nextButton.classList.add('hide');
        feedbackContainer.textContent = ''; // Clear previous feedback

        const resultsSummary = document.createElement('div');
        resultsSummary.classList.add('quiz-summary');
        resultsSummary.innerHTML = `
            <h2>Your Results</h2>
            <div class="results-stats">
                <div class="result-stat">
                    <span class="stat-label">Score:</span>
                    <span class="stat-value">${currentScore} / ${currentQuizData.length}</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Correct:</span>
                    <span class="stat-value correct-feedback">${correctAnswersCount}</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Incorrect:</span>
                    <span class="stat-value incorrect-feedback">${incorrectAnswersCount}</span>
                </div>
            </div>
        `;
        answerButtonsElement.appendChild(resultsSummary);

        if (quizResults.length > 0) {
            const incorrectAnswersTitle = document.createElement('h3');
            incorrectAnswersTitle.textContent = 'Incorrectly Answered Questions:';
            incorrectAnswersTitle.classList.add('incorrect-questions-title');
            answerButtonsElement.appendChild(incorrectAnswersTitle);

            quizResults.forEach((result, index) => {
                const incorrectItem = document.createElement('div');
                incorrectItem.classList.add('incorrect-item');
                incorrectItem.innerHTML = `
                    <p class="incorrect-question-text"><strong>Question ${index + 1}:</strong> ${result.question}</p>
                    <p>Your Answer: <span class="incorrect-feedback">${result.selectedAnswer}</span></p>
                    <p>Correct Answer: <span class="correct-feedback">${result.correctAnswer}</span></p>
                `;
                answerButtonsElement.appendChild(incorrectItem);
            });
        }

        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Quiz Selection';
        backButton.classList.add('btn', 'back-to-selection-btn');
        backButton.addEventListener('click', displayQuizCategories);
        answerButtonsElement.appendChild(backButton);
    }

    backToCategoriesButton.addEventListener('click', displayQuizCategories);

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    backFromSearchButton.addEventListener('click', displayQuizCategories);

    async function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();
        searchResultsList.innerHTML = '';

        if (query.length < 3) { // Require at least 3 characters for search
            searchResultsList.innerHTML = '<p>Please enter at least 3 characters to search.</p>';
            showSearchResults();
            return;
        }

        const matchingQuestions = allQuizzesQuestions.filter(question => {
            const questionText = question.content.text.toLowerCase();
            const answersText = question.content.answers.map(ans => ans.text.toLowerCase()).join(' ');
            return questionText.includes(query) || answersText.includes(query);
        });

        if (matchingQuestions.length === 0) {
            searchResultsList.innerHTML = '<p>No questions found matching your search.</p>';
        } else {
            matchingQuestions.forEach((question, index) => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('search-result-item');
                
                const correctAnswers = question.content.answers.filter(a => a.is_correct).map(a => a.text);
                const incorrectAnswers = question.content.answers.filter(a => !a.is_correct).map(a => a.text);

                resultItem.innerHTML = `
                    <h3>Question ${index + 1} (from ${question.quizCategory} - ${question.quizName})</h3>
                    <p>${question.content.text}</p>
                    <p><strong>Correct Answer(s):</strong> <span class="correct-feedback">${correctAnswers.join(', ')}</span></p>
                    <p><strong>Incorrect Answer(s):</strong> <span class="incorrect-feedback">${incorrectAnswers.join(', ')}</span></p>
                `;
                searchResultsList.appendChild(resultItem);
            });
        }
        showSearchResults();
    }

    function showSearchResults() {
        quizCategoriesElement.classList.add('hide');
        quizListElement.classList.add('hide');
        backToCategoriesButton.classList.add('hide');
        searchResultsContainer.classList.remove('hide');
        backFromSearchButton.classList.remove('hide');
    }

    loadQuizManifest();
});