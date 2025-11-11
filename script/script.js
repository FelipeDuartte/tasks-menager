// Gerenciador de dados com Local Storage
const TaskManager = {
    // Chave para armazenamento local
    STORAGE_KEY: 'taskflow_tasks',
    LAST_RESET_KEY: 'taskflow_last_reset',
    
    // Carregar tarefas do Local Storage
    loadTasks() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        const tasks = stored ? JSON.parse(stored) : this.getDefaultTasks();
        
        // Verificar se precisa resetar tarefas concluídas
        this.resetCompletedTasksIfNeeded(tasks);
        
        return tasks;
    },
    
    // Salvar tarefas no Local Storage
    saveTasks(tasks) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    },
    
    // Verificar e resetar tarefas concluídas se necessário
    resetCompletedTasksIfNeeded(tasks) {
        const today = new Date().toDateString();
        const lastReset = localStorage.getItem(this.LAST_RESET_KEY);
        
        // Se é um novo dia, resetar tarefas concluídas
        if (lastReset !== today) {
            let hasChanges = false;
            
            tasks.forEach(task => {
                if (task.completed) {
                    task.completed = false;
                    
                    // Restaurar a data original se era "Concluída"
                    if (task.date === 'Concluída' && task.originalDate) {
                        task.date = task.originalDate;
                    } else if (task.date === 'Concluída') {
                        // Se não tinha data original, definir como hoje
                        task.date = 'Hoje';
                    }
                    
                    hasChanges = true;
                }
            });
            
            if (hasChanges) {
                this.saveTasks(tasks);
                localStorage.setItem(this.LAST_RESET_KEY, today);
                console.log('Tarefas concluídas resetadas para o novo dia.');
            } else {
                localStorage.setItem(this.LAST_RESET_KEY, today);
            }
        }
    },
    
    // Tarefas padrão (apenas na primeira execução)
    getDefaultTasks() {
        return [
            {
                id: 1,
                title: "Reunião com a equipe de desenvolvimento",
                description: "Discutir o progresso do projeto e definir próximos passos para o sprint atual.",
                category: "Trabalho",
                priority: "high",
                date: "Hoje, 10:00",
                completed: false,
                important: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "Fazer exercícios físicos",
                description: "30 minutos de cardio e exercícios de força na academia.",
                category: "Saúde",
                priority: "medium",
                date: "Hoje, 18:00",
                completed: false,
                important: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: "Estudar JavaScript avançado",
                description: "Revisar conceitos de closures, promises e async/await.",
                category: "Estudos",
                priority: "low",
                date: "Amanhã, 19:00",
                completed: false,
                important: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                title: "Comprar mantimentos",
                description: "Frutas, verduras, pão, leite e produtos de limpeza.",
                category: "Pessoal",
                priority: "medium",
                date: "Concluída",
                completed: true,
                important: false,
                createdAt: new Date().toISOString()
            }
        ];
    }
};

// Variável global de tarefas
let tasks = [];
let currentEditId = null;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Carregar tarefas do Local Storage
    tasks = TaskManager.loadTasks();
    
    // Inicializar features mobile
    initializeMobileFeatures();
    optimizeMobileLoad();
    enhanceMobileForms();
    
    renderTasks();
    setupEventListeners();
    updateStats();
    
    // Mostrar mensagem se tarefas foram resetadas
    showResetNotificationIfNeeded();
}

// Mostrar notificação se tarefas foram resetadas
function showResetNotificationIfNeeded() {
    const today = new Date().toDateString();
    const lastResetNotification = localStorage.getItem('taskflow_last_reset_notification');
    
    if (lastResetNotification !== today) {
        const completedTasks = tasks.filter(task => 
            !task.completed && task.date !== 'Concluída' && task.originalDate
        ).length;
        
        if (completedTasks > 0) {
            showNotification(
                `Bom dia! ${completedTasks} tarefa(s) concluída(s) ontem foram reiniciadas para hoje.`,
                'info'
            );
            localStorage.setItem('taskflow_last_reset_notification', today);
        }
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Salvar nova tarefa
    document.getElementById('save-task-btn').addEventListener('click', saveTask);
    
    // Filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterTasks(this.textContent);
        });
    });
    
    // Busca
    const searchInput = document.querySelector('.form-control');
    searchInput.addEventListener('input', function() {
        searchTasks(this.value);
    });
    
    // Limpar todas as tarefas (feature extra)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Delete') {
            clearAllTasks();
        }
    });

    // Reset do modal quando fechado
    const addTaskModal = document.getElementById('addTaskModal');
    addTaskModal.addEventListener('hidden.bs.modal', function() {
        resetModal();
    });
}

// Reset do modal
function resetModal() {
    document.getElementById('add-task-form').reset();
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('addTaskModalLabel').textContent = 'Adicionar Nova Tarefa';
    document.getElementById('save-task-btn').textContent = 'Salvar Tarefa';
    currentEditId = null;
}

// Salvar tarefa (nova ou edição)
function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const priority = document.getElementById('taskPriority').value;
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;

    if (!title) {
        showNotification('Por favor, insira um título para a tarefa.', 'warning');
        return;
    }

    if (currentEditId) {
        // Modo edição
        const taskIndex = tasks.findIndex(t => t.id === currentEditId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                title,
                description,
                category,
                priority,
                date: formatTaskDate(date, time),
                // Garantir que originalDate seja mantido
                originalDate: tasks[taskIndex].originalDate || tasks[taskIndex].date
            };
            
            saveAndRender();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
            modal.hide();
            
            showNotification('Tarefa atualizada com sucesso!', 'success');
        }
    } else {
        // Modo adição
        const newTask = {
            id: Date.now(), // ID único baseado no timestamp
            title,
            description,
            category,
            priority,
            date: formatTaskDate(date, time),
            completed: false,
            important: false,
            createdAt: new Date().toISOString(),
            originalDate: formatTaskDate(date, time) // Salvar data original
        };

        tasks.unshift(newTask); // Adiciona no início do array
        saveAndRender();
        
        // Fechar modal e limpar formulário
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        
        // Mostrar feedback
        showNotification('Tarefa adicionada com sucesso!', 'success');
    }
}

// Abrir modal para edição
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditId = taskId;
    
    // Preencher formulário com dados da tarefa
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskPriority').value = task.priority;
    
    // Extrair data e hora se disponível
    if (task.originalDate && task.originalDate !== 'Sem data definida' && task.originalDate !== 'Concluída') {
        const dateParts = task.originalDate.split(', ');
        if (dateParts.length > 1) {
            // Formato: "Hoje, 10:00" ou "25 dez, 10:00"
            const timePart = dateParts[dateParts.length - 1];
            if (timePart.includes(':')) {
                document.getElementById('taskTime').value = timePart;
            }
        }
    }
    
    // Atualizar título do modal
    document.getElementById('addTaskModalLabel').textContent = 'Editar Tarefa';
    document.getElementById('save-task-btn').textContent = 'Atualizar Tarefa';
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
    modal.show();
}

// Renderizar tarefas na lista
function renderTasks(taskList = tasks) {
    const taskListContainer = document.getElementById('task-list');
    taskListContainer.innerHTML = '';

    if (taskList.length === 0) {
        taskListContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 text-muted"></i>
                <p class="text-muted mt-3">Nenhuma tarefa encontrada</p>
                <button class="btn btn-primary mt-2" onclick="addSampleTasks()">
                    <i class="bi bi-plus-circle"></i> Adicionar Tarefas de Exemplo
                </button>
            </div>
        `;
        return;
    }

    // Ordenar tarefas: importantes primeiro, depois não concluídas, depois concluídas
    const sortedTasks = [...taskList].sort((a, b) => {
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    sortedTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskListContainer.appendChild(taskElement);
    });
}

// Criar elemento HTML para uma tarefa
function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.important ? 'task-important' : ''}`;
    taskDiv.setAttribute('data-task-id', task.id);
    
    const priorityClass = task.priority === 'high' ? 'text-danger' : 
                         task.priority === 'medium' ? 'text-warning' : 'text-success';
    
    taskDiv.innerHTML = `
        <div class="task-header">
            <div>
                <div class="task-title fs-5">${escapeHtml(task.title)}</div>
                <span class="task-category">${escapeHtml(task.category)}</span>
            </div>
            <div class="form-check">
                <input class="form-check-input border border-dark-subtle" type="checkbox" ${task.completed ? 'checked' : ''}>
            </div>
        </div>
        <div class="task-description">
            ${escapeHtml(task.description)}
        </div>
        <div class="task-footer">
            <div class="task-date ${task.completed ? 'text-success' : ''}">
                <i class="bi ${task.completed ? 'bi-check-circle' : 'bi-calendar-event'}"></i> 
                ${escapeHtml(task.date)}
            </div>
            <div class="task-actions">
                <button class="toggle-important" data-id="${task.id}" title="${task.important ? 'Remover dos importantes' : 'Marcar como importante'}">
                    <i class="bi ${task.important ? 'bi-star-fill text-warning' : 'bi-star'}"></i>
                </button>
                <button class="edit-task" data-id="${task.id}" title="Editar tarefa">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="delete-task" data-id="${task.id}" title="Excluir tarefa">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;

    // Adicionar event listeners para os botões da tarefa
    const checkbox = taskDiv.querySelector('.form-check-input');
    checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

    const importantBtn = taskDiv.querySelector('.toggle-important');
    importantBtn.addEventListener('click', () => toggleTaskImportant(task.id));

    const editBtn = taskDiv.querySelector('.edit-task');
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = taskDiv.querySelector('.delete-task');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    return taskDiv;
}

// Formatar data da tarefa
function formatTaskDate(date, time) {
    if (!date && !time) return 'Sem data definida';
    
    // Corrigir parsing de data: manter fuso local
    const [year, month, day] = date ? date.split('-') : [];
    const taskDate = date ? new Date(year, month - 1, day) : new Date();

    const today = new Date();
    const sameDay = taskDate.toDateString() === today.toDateString();

    if (sameDay) {
        return time ? `Hoje, ${time}` : 'Hoje';
    } else {
        const options = { day: 'numeric', month: 'short' };
        const formattedDate = taskDate.toLocaleDateString('pt-BR', options);
        return time ? `${formattedDate}, ${time}` : formattedDate;
    }
}

// Alternar estado de conclusão da tarefa
function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        
        if (task.completed) {
            // Salvar data original antes de marcar como concluída
            if (task.date !== 'Concluída') {
                task.originalDate = task.date;
            }
            task.date = 'Concluída';
        } else {
            // Restaurar data original ao desmarcar
            if (task.originalDate) {
                task.date = task.originalDate;
            } else {
                // Se não tinha data original, definir como hoje
                task.date = 'Hoje';
            }
        }
        
        saveAndRender();
        
        // Mostrar feedback
        if (task.completed) {
            showNotification('Tarefa marcada como concluída!', 'success');
        }
    }
}

// Alternar estado de importância da tarefa
function toggleTaskImportant(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.important = !task.important;
        saveAndRender();
        showNotification(
            task.important ? 'Tarefa marcada como importante!' : 'Tarefa removida dos importantes.', 
            'info'
        );
    }
}

// Excluir tarefa
function deleteTask(taskId) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveAndRender();
        showNotification('Tarefa excluída com sucesso!', 'info');
    }
}

// Filtrar tarefas
function filterTasks(filter) {
    let filteredTasks = [...tasks];
    
    switch(filter) {
        case 'Hoje':
            filteredTasks = tasks.filter(task => task.date.includes('Hoje') && !task.completed);
            break;
        case 'Próximos 7 dias':
            // Implementação simplificada - em uma aplicação real, você compararia datas
            filteredTasks = tasks.filter(task => 
                !task.date.includes('Hoje') && 
                !task.date.includes('Concluída') && 
                !task.completed
            );
            break;
        case 'Importantes':
            filteredTasks = tasks.filter(task => task.important && !task.completed);
            break;
        case 'Concluídas':
            filteredTasks = tasks.filter(task => task.completed);
            break;
        default:
            // 'Todas' - mostra todas as tarefas
            break;
    }
    
    renderTasks(filteredTasks);
}

// Buscar tarefas
function searchTasks(query) {
    if (!query.trim()) {
        renderTasks();
        return;
    }
    
    const filteredTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description.toLowerCase().includes(query.toLowerCase()) ||
        task.category.toLowerCase().includes(query.toLowerCase())
    );
    
    renderTasks(filteredTasks);
}

// Atualizar estatísticas
function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const importantTasks = tasks.filter(task => task.important && !task.completed).length;
    const pendingTasks = tasks.filter(task => !task.completed).length;

    // Atualizar números nas estatísticas
    const statNumbers = document.querySelectorAll('.stats-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = pendingTasks;
        statNumbers[1].textContent = completedTasks;
        statNumbers[2].textContent = tasks.filter(task => 
            !task.completed && isTaskOverdue(task)
        ).length;
        statNumbers[3].textContent = importantTasks;
    }

    // Atualizar barras de progresso
    const progressBars = document.querySelectorAll('.progress-bar');
    if (progressBars.length >= 4) {
        progressBars[0].style.width = `${(pendingTasks / Math.max(totalTasks, 1)) * 100}%`;
        progressBars[1].style.width = `${(completedTasks / Math.max(totalTasks, 1)) * 100}%`;
        progressBars[2].style.width = `${(tasks.filter(task => !task.completed && isTaskOverdue(task)).length / Math.max(totalTasks, 1)) * 100}%`;
        progressBars[3].style.width = `${(importantTasks / Math.max(totalTasks, 1)) * 100}%`;
    }
}

// Verificar se a tarefa está atrasada
function isTaskOverdue(task) {
    if (task.completed || !task.date || task.date.includes('Hoje') || task.date.includes('Concluída')) {
        return false;
    }
    
    // Lógica simplificada para verificar se a tarefa está atrasada
    return task.date.includes('Ontem') || new Date(task.createdAt) < new Date(Date.now() - 24 * 60 * 60 * 1000);
}

// Salvar e renderizar (função auxiliar)
function saveAndRender() {
    TaskManager.saveTasks(tasks);
    renderTasks();
    updateStats();
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
    `;
    notification.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Remover automaticamente após 3 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Escapar HTML para prevenir XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===== FUNÇÕES DE GERENCIAMENTO AVANÇADO =====

// Adicionar tarefas de exemplo
function addSampleTasks() {
    const sampleTasks = TaskManager.getDefaultTasks();
    tasks = [...sampleTasks];
    saveAndRender();
    showNotification('Tarefas de exemplo adicionadas!', 'success');
}

// Limpar todas as tarefas
function clearAllTasks() {
    if (confirm('Tem certeza que deseja limpar TODAS as tarefas? Esta ação não pode ser desfeita.')) {
        tasks = [];
        saveAndRender();
        showNotification('Todas as tarefas foram removidas!', 'info');
    }
}

// Exportar tarefas (feature extra)
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Importar tarefas (feature extra)
function importTasks(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTasks = JSON.parse(e.target.result);
            if (Array.isArray(importedTasks)) {
                tasks = importedTasks;
                saveAndRender();
                showNotification('Tarefas importadas com sucesso!', 'success');
            } else {
                showNotification('Arquivo inválido!', 'danger');
            }
        } catch (error) {
            showNotification('Erro ao importar tarefas!', 'danger');
        }
    };
    reader.readAsText(file);
}

// ===== MOBILE ENHANCEMENTS =====

// Inicializar funcionalidades mobile
function initializeMobileFeatures() {
    setupMobileNavigation();
    setupSwipeActions();
    setupPullToRefresh();
    checkConnection();
}

// Configurar navegação mobile
function setupMobileNavigation() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover active de todos os itens
            navItems.forEach(nav => nav.classList.remove('active'));
            // Adicionar active ao item clicado
            this.classList.add('active');
            
            const action = this.querySelector('span').textContent;
            handleMobileNavAction(action);
        });
    });
}

// Ações da navegação mobile
function handleMobileNavAction(action) {
    switch(action) {
        case 'Nova':
            const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
            modal.show();
            break;
        case 'Início':
            filterTasks('Todas');
            break;
        case 'Hoje':
            filterTasks('Hoje');
            break;
        case 'Importantes':
            filterTasks('Importantes');
            break;
        case 'Concluídas':
            filterTasks('Concluídas');
            break;
    }
}

// Configurar ações de swipe
function setupSwipeActions() {
    let startX, startY, distX, distY;
    const minSwipeDistance = 50;
    
    document.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        const touch = e.touches[0];
        distX = touch.clientX - startX;
        distY = touch.clientY - startY;
        
        // Prevenir scroll vertical durante swipe horizontal
        if (Math.abs(distX) > Math.abs(distY)) {
            e.preventDefault();
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (!distX || Math.abs(distX) < minSwipeDistance) return;
        
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;
        
        const taskId = parseInt(taskCard.dataset.taskId);
        
        if (distX > 0) {
            // Swipe direito - marcar como concluída
            toggleTaskComplete(taskId);
            showSwipeFeedback(taskCard, 'right');
        } else {
            // Swipe esquerdo - excluir
            deleteTask(taskId);
            showSwipeFeedback(taskCard, 'left');
        }
        
        // Reset
        startX = startY = distX = distY = null;
    });
}

// Feedback visual do swipe
function showSwipeFeedback(element, direction) {
    element.classList.add(`swipe-${direction}`);
    setTimeout(() => {
        element.classList.remove(`swipe-${direction}`);
    }, 300);
}

// Pull to refresh
function setupPullToRefresh() {
    let startY;
    const pullThreshold = 60;
    
    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
        }
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!startY || window.scrollY > 0) return;
        
        const currentY = e.touches[0].pageY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > pullThreshold) {
            refreshTasks();
            startY = null;
        }
    });
}

// Atualizar tarefas
function refreshTasks() {
    showNotification('Tarefas atualizadas!', 'info');
    renderTasks();
    updateStats();
}

// Verificar conexão
function checkConnection() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    window.addEventListener('online', function() {
        offlineIndicator.style.display = 'none';
        showNotification('Conexão restaurada', 'success');
    });
    
    window.addEventListener('offline', function() {
        offlineIndicator.style.display = 'block';
    });
}

// Otimização para mobile - carregamento inicial
function optimizeMobileLoad() {
    // Reduzir animações em dispositivos com pouca energia
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
        document.documentElement.style.setProperty('--box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
    }
    
    // Preload de ícones críticos
    const criticalIcons = ['bi-plus-lg', 'bi-check2-square', 'bi-house-door'];
    criticalIcons.forEach(icon => {
        const preload = document.createElement('link');
        preload.rel = 'preload';
        preload.href = `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css`;
        preload.as = 'style';
        document.head.appendChild(preload);
    });
}

// Melhorar formulários para mobile
function enhanceMobileForms() {
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="time"]');
    dateInputs.forEach(input => {
        input.addEventListener('focus', function() {
            // Scroll suave para o campo em foco
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });

    // Melhorar a experiência de toque nos botões
    const buttons = document.querySelectorAll('button, .btn, .task-actions button');
    buttons.forEach(button => {
        button.style.cursor = 'pointer';
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        button.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });
}