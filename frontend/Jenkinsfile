// ------------------------------------------------------------
// Jenkinsfile — CI/CD pipeline for LLM RAG Project
// Flow:
// Clean Workspace
// → Checkout
// → Build Docker Image
// → Push DockerHub
// → Deploy EC2
// → Cleanup Docker
// ------------------------------------------------------------

pipeline {
    agent any

    environment {
        IMAGE_NAME     = "llm-rag-app"
        IMAGE_TAG      = "${BUILD_NUMBER}"
        DOCKERHUB_USER = "janandababu2023"

        EC2_HOST       = credentials('EC2_HOST')
        OPENAI_API_KEY = credentials('OPENAI_API_KEY')
    }

    stages {

        // --------------------------------------------------
        // Clean workspace
        // --------------------------------------------------
        stage('Clean Workspace') {
            steps {
                cleanWs()
                echo "✅ Workspace cleaned"
            }
        }

        // --------------------------------------------------
        // Checkout latest code
        // --------------------------------------------------
        stage('Checkout') {
            steps {
                checkout scm

                echo "✅ Latest code pulled"

                sh '''
                echo "Branch: ${BRANCH_NAME:-master}"
                '''
            }
        }

        // --------------------------------------------------
        // Build Docker image
        // --------------------------------------------------
        stage('Build Docker Image') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sh '''
                    echo "🔨 Building Docker Image..."

                    docker build \
                    -t ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG} \
                    -t ${DOCKERHUB_USER}/${IMAGE_NAME}:latest \
                    .

                    echo "✅ Docker build completed"
                '''
            }
        }

        // --------------------------------------------------
        // Push Docker image
        // --------------------------------------------------
        stage('Push to Docker Hub') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                withCredentials([
                    usernamePassword(
                    credentialsId:'dockerhub-creds',
                    usernameVariable:'DH_USER',
                    passwordVariable:'DH_PASS'
                    )
                ]) {

                    sh '''
                        echo "📦 Docker Login"

                        echo "$DH_PASS" | docker login \
                        -u "$DH_USER" \
                        --password-stdin

                        echo "📤 Pushing image..."

                        docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}

                        docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                        docker logout

                        echo "✅ Push completed"
                    '''
                }
            }
        }

        // --------------------------------------------------
        // Deploy to EC2
        // --------------------------------------------------
        stage('Deploy to EC2') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sshagent(credentials: ['ec2-ssh-key']) {

                    sh '''
                    echo "🚀 Deploying..."

                    ssh -o StrictHostKeyChecking=no $EC2_HOST "

                        echo 'Pull latest image'

                        docker pull ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                        echo 'Stop old container'

                        docker stop llm-rag || true
                        docker rm llm-rag || true

                        echo 'Run new container'

                        docker run -d \
                        --name llm-rag \
                        --restart unless-stopped \
                        -p 8000:8000 \
                        -e OPENAI_API_KEY='${OPENAI_API_KEY}' \
                        ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                        echo 'Verify container'

                        docker ps

                        echo 'Cleanup old Docker data'

                        docker system prune -af --volumes || true

                    "

                    echo "✅ Deployment completed"

                    '''
                }
            }
        }
    }

    // --------------------------------------------------
    // Post Actions
    // --------------------------------------------------

    post {

        success {
            echo "✅ Build #${BUILD_NUMBER} SUCCESS"
        }

        failure {
            echo "❌ Build #${BUILD_NUMBER} FAILED"
        }

        always {

            sh '''
                echo "🧹 Cleaning Docker"

                docker system prune -af --volumes || true

                docker builder prune -af || true
            '''
        }
    }
}
