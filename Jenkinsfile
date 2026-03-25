pipeline {
    agent any

    tools {
        nodejs 'Node-24'
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target environment for deployment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip tests (emergency use only)'
        )
    }

    environment {
        REGISTRY = 'docker.io/ravinder50300'
        FRONTEND_IMAGE_REPO = "${REGISTRY}/vox-frontend"
        BACKEND_IMAGE_REPO = "${REGISTRY}/vox-backend"
        HELM_RELEASE_FRONTEND = 'vox-frontend'
        HELM_RELEASE_BACKEND = 'vox-backend'
        KUBE_NAMESPACE = "${params.ENVIRONMENT}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
        ansiColor('xterm')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Init') {
            steps {
                script {
                    env.GIT_SHA = sh(
                        script: 'git rev-parse --short=8 HEAD',
                        returnStdout: true
                    ).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHA}"
                    env.FRONTEND_IMAGE = "${env.FRONTEND_IMAGE_REPO}:${env.IMAGE_TAG}"
                    env.BACKEND_IMAGE = "${env.BACKEND_IMAGE_REPO}:${env.IMAGE_TAG}"
                }

                echo "Environment: ${params.ENVIRONMENT}"
                echo "Frontend image: ${env.FRONTEND_IMAGE}"
                echo "Backend image: ${env.BACKEND_IMAGE}"
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Frontend Install') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }

                stage('Backend Install') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npm run db:generate'
                        }
                    }
                }
            }
        }

        stage('Test') {
            when {
                expression { !params.SKIP_TESTS }
            }
            parallel {
                stage('Frontend Test') {
                    steps {
                        dir('frontend') {
                            sh 'npm test'
                        }
                    }
                }

                stage('Backend Test') {
                    steps {
                        dir('backend') {
                            sh 'npm test'
                        }
                    }
                }
            }
        }

        stage('Build Apps') {
            parallel {
                stage('Frontend Build') {
                    steps {
                        dir('frontend') {
                            sh 'npm run build'
                        }
                    }
                }

                stage('Backend Build') {
                    steps {
                        dir('backend') {
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh "docker build -t ${env.FRONTEND_IMAGE} apps/frontend"
                sh "docker build -t ${env.BACKEND_IMAGE} apps/backend"
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh 'echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin'
                    sh "docker push ${env.FRONTEND_IMAGE}"
                    sh "docker push ${env.BACKEND_IMAGE}"
                    sh 'docker logout || true'
                }
            }
        }
    }

    post {
        always {
            cleanWs(deleteDirs: true, notFailBuild: true)
        }
        success {
            echo "✅Pipeline completed successfully for ${params.ENVIRONMENT} with image tag ${env.IMAGE_TAG}"
        }
        failure {
            echo '❌Pipeline failed'
        }
    }
}
