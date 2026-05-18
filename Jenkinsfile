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

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            when {
                anyOf {
                    branch 'master'
                    expression { env.BRANCH_NAME == null }
                }
            }

            steps {
                sh '''
                docker build \
                -t ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG} \
                -t ${DOCKERHUB_USER}/${IMAGE_NAME}:latest .
                '''
            }
        }

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
                    -u "$DH_USER" --password-stdin

                    docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    docker logout
                    '''
                }
            }
        }

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
                    ssh -o StrictHostKeyChecking=no $EC2_HOST << EOF

                    docker pull ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    docker stop llm-rag || true
                    docker rm llm-rag || true

                    docker run -d \
                    --name llm-rag \
                    --restart unless-stopped \
                    -p 8000:8000 \
                    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
                    ${DOCKERHUB_USER}/${IMAGE_NAME}:latest

                    EOF
                    '''
                }
            }
        }

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
                    ssh -o StrictHostKeyChecking=no $EC2_HOST << 'EOF'

                    npm list -g pm2 || sudo npm install -g pm2

                    cd ~/llm-ops-frontend/frontend

                    git fetch origin master
                    git reset --hard origin/master

                    rm -rf node_modules package-lock.json dist
                    npm install

                    echo "Get EC2 Public IP using IMDSv2"

                    TOKEN=$(curl -X PUT \
                    http://169.254.169.254/latest/api/token \
                    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -s)

                    PUBLIC_IP=$(curl \
                    -H "X-aws-ec2-metadata-token: $TOKEN" \
                    http://169.254.169.254/latest/meta-data/public-ipv4 -s)

                    echo "Detected: $PUBLIC_IP"

                    echo "VITE_API_URL=http://$PUBLIC_IP:8000" > .env.production

                    cat .env.production

                    rm -rf dist
                    npm run build

                    pm2 delete frontend || true
                    pm2 serve dist 3000 --spa --name frontend
                    pm2 save

                    EOF
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
            docker system prune -af --volumes || true
            docker builder prune -af || true
            '''
        }
    }
}
