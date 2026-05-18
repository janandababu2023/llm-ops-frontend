pipeline {
    agent any

    environment {
        OPENAI_API_KEY = credentials('OPENAI_API_KEY')
        EC2_HOST = credentials('EC2_HOST')
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
                echo '✅ Workspace cleaned'
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
                echo '✅ Latest code pulled'
                sh 'echo Branch: $(git branch --show-current)'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    echo "🔨 Building Docker Image..."
                    docker build -t janandababu2023/llm-rag-app:1 -t janandababu2023/llm-rag-app:latest .
                    echo "✅ Docker build completed"
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([string(credentialsId: 'DH_PASS', variable: 'DH_PASS')]) {
                    sh '''
                        echo "📦 Docker Login"
                        echo $DH_PASS | docker login -u janandababu2023 --password-stdin
                        echo "📤 Pushing image..."
                        docker push janandababu2023/llm-rag-app:1
                        docker push janandababu2023/llm-rag-app:latest
                        docker logout
                        echo "✅ Push completed"
                    '''
                }
            }
        }

        stage('Deploy Backend to EC2') {
            steps {
                sshagent(['ubuntu']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_HOST} '
                            echo "Pull latest image"
                            docker pull janandababu2023/llm-rag-app:latest

                            echo "Stop old container"
                            docker stop llm-rag || true
                            docker rm llm-rag || true

                            echo "Run new container"
                            docker run -d \\
                                --name llm-rag \\
                                --restart unless-stopped \\
                                -p 8000:8000 \\
                                -e OPENAI_API_KEY=${OPENAI_API_KEY} \\
                                janandababu2023/llm-rag-app:latest

                            echo "Verify container"
                            docker ps

                            echo "Cleanup old Docker data"
                            docker system prune -af --volumes || true
                        '
                    """
                }
            }
        }

        stage('Deploy Frontend to EC2') {
            steps {
                sshagent(['ubuntu']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_HOST} '
                            echo "Deploy Frontend"
                            cd /home/ubuntu/llm-ops-frontend/frontend

                            echo "Pull latest code"
                            git pull origin main

                            echo "Clean old build"
                            rm -rf node_modules package-lock.json dist

                            echo "Install dependencies"
                            npm install

                            echo "Build React app"
                            npm run build

                            echo "Restart frontend server"
                            pm2 delete frontend || true
                            pm2 serve dist 3000 --spa --name frontend
                            pm2 save

                            echo "✅ Frontend deployed"
                        '
                    """
                }
            }
        }

    }

    post {
        always {
            sh '''
                echo "🧹 Cleaning Docker"
                docker system prune -af --volumes
                docker builder prune -af
            '''
            echo "✅ Build #${BUILD_NUMBER} ${currentBuild.result}"
        }
    }
}
