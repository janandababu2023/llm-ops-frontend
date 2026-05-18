// ------------------------------------------------------------
// Jenkinsfile — CI/CD pipeline for LLM RAG Project
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

        // ----------------------------------------
        // Clean workspace
        // ----------------------------------------
        stage('Clean Workspace') {
            steps {
                cleanWs()
                echo "✅ Workspace cleaned"
            }
        }

        // ----------------------------------------
        // Checkout
        // ----------------------------------------
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                echo "Current Branch: ${BRANCH_NAME:-master}"
                '''
            }
        }

        // ----------------------------------------
        // Build Docker image
        // ----------------------------------------
        stage('Build Docker Image') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sh '''
                echo "🔨 Building image"

                docker build \
                -t ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG} \
                -t ${DOCKERHUB_USER}/${IMAGE_NAME}:latest \
                .

                echo "✅ Docker build complete"
                '''
            }
        }

        // ----------------------------------------
        // Push DockerHub
        // ----------------------------------------
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
                    echo "$DH_PASS" | docker login \
                    -u "$DH_USER" \
                    --password-stdin

                    docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    docker logout

                    echo "✅ Push complete"
                    '''
                }
            }
        }

        // ----------------------------------------
        // Deploy Backend
        // ----------------------------------------
        stage('Deploy Backend') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sshagent(credentials:['ec2-ssh-key']) {

                    sh """
                    ssh -o StrictHostKeyChecking=no ${EC2_HOST} '

                    echo "Pull image"

                    docker pull ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    echo "Stop old container"

                    docker stop llm-rag || true
                    docker rm llm-rag || true

                    echo "Run backend"

                    docker run -d \
                    --name llm-rag \
                    --restart unless-stopped \
                    -p 8000:8000 \
                    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
                    ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    docker ps
                    '
                    """
                }
            }
        }

        // ----------------------------------------
        // Deploy Frontend
        // ----------------------------------------
        stage('Deploy Frontend') {

            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {

                sshagent(credentials:['ec2-ssh-key']) {

                    sh """
                    ssh -o StrictHostKeyChecking=no ${EC2_HOST} '

                    echo "Install PM2"

                    npm list -g pm2 || sudo npm install -g pm2

                    cd ~/llm-ops-frontend/frontend

                    echo "Pull latest code"

                    git fetch origin master
                    git reset --hard origin/master

                    echo "Clean build"

                    rm -rf node_modules package-lock.json dist

                    npm install

                    echo "Get EC2 public IP using IMDSv2"

                    TOKEN=\$(curl -X PUT \
                    http://169.254.169.254/latest/api/token \
                    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -s)

                    PUBLIC_IP=\$(curl \
                    -H "X-aws-ec2-metadata-token: \$TOKEN" \
                    http://169.254.169.254/latest/meta-data/public-ipv4 -s)

                    echo "Detected IP: \$PUBLIC_IP"

                    echo "VITE_API_URL=http://\$PUBLIC_IP:8000" > .env.production

                    echo "Verify env"
                    cat .env.production

                    echo "Build frontend"

                    npm run build

                    echo "Restart PM2"

                    pm2 delete frontend || true

                    pm2 serve dist 3000 --spa --name frontend

                    pm2 save
                    '
                    """
                }
            }
        }
    }

    // ----------------------------------------
    // Post cleanup
    // ----------------------------------------

    post {

        success {
            echo "✅ Build #${BUILD_NUMBER} SUCCESS"
        }

        failure {
            echo "❌ Build #${BUILD_NUMBER} FAILED"
        }

        always {

            sh '''
            docker system prune -af --volumes || true
            docker builder prune -af || true
            '''
        }
    }
}
