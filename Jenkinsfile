// ------------------------------------------------------------
// Jenkinsfile — CI/CD pipeline for LLM RAG Project
// Flow:
// Clean Workspace
// → Checkout
// → Build Docker Image
// → Push DockerHub
// → Deploy Backend EC2
// → Deploy Frontend
// → Cleanup
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

        // ------------------------------------------------
        // Clean Workspace
        // ------------------------------------------------
        stage('Clean Workspace') {
            steps {
                cleanWs()
                echo "✅ Workspace cleaned"
            }
        }

        // ------------------------------------------------
        // Checkout
        // ------------------------------------------------
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                echo "Current Branch: ${BRANCH_NAME:-master}"
                '''
            }
        }

        // ------------------------------------------------
        // Build Docker Image
        // ------------------------------------------------
        stage('Build Docker Image') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sh '''
                echo "🔨 Building Docker image..."

                docker build \
                -t ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG} \
                -t ${DOCKERHUB_USER}/${IMAGE_NAME}:latest \
                .

                echo "✅ Build completed"
                '''
            }
        }

        // ------------------------------------------------
        // Push DockerHub
        // ------------------------------------------------
        stage('Push DockerHub') {

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

                    echo "📤 Pushing images..."

                    docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}

                    docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    docker logout

                    echo "✅ Push successful"
                    '''
                }
            }
        }

        // ------------------------------------------------
        // Deploy Backend
        // ------------------------------------------------
        stage('Deploy Backend') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sshagent(credentials:['ec2-ssh-key']) {

                    sh '''
                    echo "🚀 Deploy Backend"

                    ssh -o StrictHostKeyChecking=no $EC2_HOST "

                    echo 'Remove stale image'

                    docker rmi ${DOCKERHUB_USER}/${IMAGE_NAME}:latest || true

                    echo 'Pull latest image'

                    docker pull ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    echo 'Stop old container'

                    docker stop llm-rag || true
                    docker rm llm-rag || true

                    echo 'Run container'

                    docker run -d \
                    --name llm-rag \
                    --restart unless-stopped \
                    -p 8000:8000 \
                    -e OPENAI_API_KEY='${OPENAI_API_KEY}' \
                    ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    echo 'Verify'

                    docker ps

                    docker system prune -af --volumes || true

                    "

                    echo "✅ Backend deployed"
                    '''
                }
            }
        }

        // ------------------------------------------------
        // Deploy Frontend
        // ------------------------------------------------
        stage('Deploy Frontend') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sshagent(credentials:['ec2-ssh-key']) {

                    sh '''
                    echo "🚀 Deploy Frontend"

                    ssh -o StrictHostKeyChecking=no $EC2_HOST "

                    echo 'Install PM2'
                    npm list -g pm2 || sudo npm install -g pm2

                    echo 'Go frontend'
                    cd /home/ubuntu/llm-ops-frontend/frontend

                    echo 'Pull latest code'

                    git fetch origin master
                    git reset --hard origin/master

                    echo 'Remove old build'

                    rm -rf node_modules package-lock.json dist

                    echo 'Install packages'

                    npm install

                    echo 'Detect EC2 Public IP'

PUBLIC_IP=\$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo \"Detected IP: \$PUBLIC_IP\"

echo \"VITE_API_URL=http://\$PUBLIC_IP:8000\" > .env.production

echo 'Verify env'
cat .env.production
                    echo 'Build frontend'

                    npm run build

                    echo 'Restart PM2'

                    pm2 delete frontend || true

                    pm2 serve dist 3000 --spa --name frontend

                    pm2 save

                    "

                    echo "✅ Frontend deployed"
                    '''
                }
            }
        }
    }

    // ------------------------------------------------
    // Cleanup
    // ------------------------------------------------

    post {

        success {
            echo "✅ Build #${BUILD_NUMBER} SUCCESS"
        }

        failure {
            echo "❌ Build #${BUILD_NUMBER} FAILED"
        }

        always {

            sh '''
            echo "🧹 Cleanup"

            docker system prune -af --volumes || true
            docker builder prune -af || true
            '''
        }
    }
}
