const FACE = {};

        FACE.EXPRESSION = () => {
            const cameraArea = document.getElementById('cameraArea'),
                camera = document.getElementById('camera'),
                canvas = document.getElementById('canvas'),
                ctx = canvas.getContext('2d'),
                canvasW = 640,
                canvasH = 480,
                intervalTime = 1000;

            let previousScoreBox = null;
            let happyScores = []; // Happyスコアを記録する配列
            let isCounting = false; // 計測が開始されたかどうか
            let startButton = document.getElementById('startButton');
            let averageScoreBox = document.getElementById('averageScoreBox');
            let lineChartCtx = document.getElementById('lineChart').getContext('2d');

            // 初期ラベルを1秒から10秒まで設定
            let initialLabels = Array.from({ length: 10 }, (_, i) => i + 1);
            let lineChart = new Chart(lineChartCtx, {
                type: 'line',
                data: {
                    labels: initialLabels, // 初期ラベル (1〜10秒)
                    datasets: [{
                        label: 'Happy Score (%)',
                        data: Array(10).fill(null), // 初期値 (nullで埋める)
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // 横幅を可変に
                    scales: {
                        x: {
                            ticks: {
                                stepSize: 1 // 1秒ごとに表示
                            }
                        },
                        y: {
                            min: 0,
                            max: 100
                        }
                    }
                }
            });

            const init = async () => {
                setCanvas();
                setCamera();
                await faceapi.nets.tinyFaceDetector.load("./js/weights/");
                await faceapi.nets.faceExpressionNet.load("./js/weights/");
            },

            setCanvas = () => {
                canvas.width = canvasW;
                canvas.height = canvasH;
            },

            setCamera = async () => {
                var constraints = {
                    audio: false,
                    video: {
                        width: canvasW,
                        height: canvasH,
                        facingMode: 'user'
                    }
                };
                await navigator.mediaDevices.getUserMedia(constraints)
                    .then((stream) => {
                        camera.srcObject = stream;
                        camera.onloadedmetadata = (e) => {
                            playCamera();
                        };
                    })
                    .catch((err) => {
                        console.log(err.name + ': ' + err.message);
                    });
            },

            playCamera = () => {
                camera.play();
                setInterval(async () => {
                    if (isCounting) {
                        canvas.getContext('2d').clearRect(0, 0, canvasW, canvasH);
                        checkFace();
                    }
                }, intervalTime);
            },

            checkFace = async () => {
                let faceData = await faceapi.detectAllFaces(
                    camera, new faceapi.TinyFaceDetectorOptions()
                ).withFaceExpressions();
                if (faceData.length) {
                    const setDetection = () => {
                        let box = faceData[0].detection.box;
                        x = box.x,
                        y = box.y,
                        w = box.width,
                        h = box.height;

                        ctx.beginPath();
                        ctx.rect(x, y, w, h);
                        ctx.strokeStyle = '#76FF03';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    },

                    setExpressions = () => {
                        let happy = faceData[0].expressions.happy;
                        let score = Math.round(happy * 100); // Happyスコアを整数に変換

                        // 前のスコアボックスがあれば削除
                        if (previousScoreBox) {
                            previousScoreBox.remove();
                        }

                        // 新しいスコアボックスを作成
                        let scoreBox = document.createElement('div');
                        scoreBox.className = 'scoreBox';
                        scoreBox.style.left = (x + w / 2) - 25 + 'px'; // 顔の中心に配置
                        scoreBox.style.top = (y - 30) + 'px'; // 顔の上に配置
                        scoreBox.textContent = `Happy: ${score}%`;

                        // スコアボックスをカメラ領域に追加
                        cameraArea.appendChild(scoreBox);

                        // 現在のスコアボックスを保持
                        previousScoreBox = scoreBox;

                        // Happyスコアの履歴を更新
                        if (happyScores.length >= 10) { // 10秒分のデータを保持
                            happyScores.shift();
                        }
                        happyScores.push(score);

                        // ラインチャートを更新
                        updateLineChart();
                    };

                    setDetection();
                    setExpressions();
                }
            };

            const updateLineChart = () => {
                // ラインチャートのデータを更新
                lineChart.data.datasets[0].data = happyScores; // Happyスコアのデータ
                lineChart.update(); // チャートを再描画
            };

            const updateAverageScore = () => {
                let averageScore = Math.round(happyScores.reduce((acc, score) => acc + score, 0) / happyScores.length);
                averageScoreBox.textContent = `Average: ${averageScore}%`;

                // メッセージを追加
                if (averageScore === 100) {
                    averageScoreBox.textContent += " - Excellent";
                } else if (averageScore >= 80) {
                    averageScoreBox.textContent += " - Good job";
                } else {
                    averageScoreBox.textContent += " - Smile more";
                }

                averageScoreBox.style.display = 'block'; // 平均スコアを表示
            };

            startButton.addEventListener('click', () => {
                happyScores = []; // スコアの履歴をリセット
                lineChart.data.datasets[0].data = []; // チャートのデータをリセット
                lineChart.update(); // チャートを更新
                averageScoreBox.style.display = 'none'; // 平均スコアを非表示
                isCounting = true; // 計測開始

                // スタートボタンを非表示
                startButton.style.display = 'none';

                let checkInterval = setInterval(() => {
                    if (happyScores.length === 10) {
                        clearInterval(checkInterval); // 10データポイント取得したら停止
                        isCounting = false; // 計測終了
                        updateAverageScore(); // 平均スコアを表示
                        startButton.style.display = 'block';

                        // スコアボックスと顔の枠を削除
                        if (previousScoreBox) {
                            previousScoreBox.remove();
                        }

                        // もしdetection boxがある場合はcanvasから消す
                        ctx.clearRect(0, 0, canvas.width, canvas.height); 
                    }
                }, intervalTime); // 1秒ごとにチェック
            });

            init();
        };
        FACE.EXPRESSION();