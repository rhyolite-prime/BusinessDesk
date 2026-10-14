const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            performanceAreaList: [],
            performanceSkillList: [],
            performanceMap: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
        }
},

    methods: {
    getSetupData() {
    return Promise.all([
    axios.get('/SmMainSetups/ListAllPerformanceAreas/'),
    axios.get('/SmMainSetups/ListAllPerformanceSkills/')
    ])
    .then(([areas, skills]) => {
    this.performanceAreaList = areas.data;
    this.performanceSkillList = skills.data;

    // link skills to their respective areas
        this.performanceMap = {};
        this.performanceAreaList.forEach(area => {
            area.performanceAreaId = area.id;
            area.skills = this.performanceSkillList.filter(p => p.performanceAreaId === area.id);
            this.performanceMap[area.id] = area.skills;
});

    this.dataTable(this.performanceAreaList);
})
    .catch(() => {
    this.toastHandler('error', 'Unable to load performance areas and skills.');
});
},

    dataTable(responseData) {
    $("#dataTable").ejGrid({
    dataSource: responseData,
    allowPaging: true,
    allowSorting: true,
    isResponsive: true,
    pageSettings: { pageSize: 20, pageSizeList: [10, 20, 50, 100] },
    scrollSettings: { width: "1200px", height: "400px" },
    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
    columns: [
{ field: "id", isPrimaryKey: true, visible: false },
{ field: "name", headerText: "Performance Area", validationRules: { required: true }, width: 150 },
{ field: "tenantId", visible: false },
    ],
    childGrid: {
    dataSource: this.performanceSkillList,
    queryString: "performanceAreaId",
    allowPaging: true,
    allowSorting: true,
    isResponsive: true,
    pageSettings: { pageSize: 10 },
    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
    columns: [
{ field: "id", isPrimaryKey: true, visible: false },
{ field: "name", headerText: "Performance Skill", validationRules: { required: true }, width: 150 },
{ field: "performanceAreaId", visible: false },
{ field: "tenantId", visible: false },
    ],
    endAdd: (args) => {
    if (!args.data.performanceAreaId || args.data.performanceAreaId === this.emptyGuid) {
    args.data.performanceAreaId = this.performanceAreaId;
}
    this.saveSkill(args.data);
},
    endEdit: (args) => {
    this.updateSkill(args.data);
},
    endDelete: (args) => {
    this.delSkill(args.data.id);
}
},
    endAdd: (args) => {
    this.saveArea(args.data);
},
    endEdit: (args) => {
    this.updateArea(args.data);
},
    endDelete: (args) => {
    this.delArea(args.data.id);
}
});
},

    // === CRUD: Performance Area ===
    saveArea(payload) {
    delete payload.id;
    axios.post('/SmMainSetups/CreatePerformanceArea/', payload)
    .then(response => {
        if (response.data.code === 200) {
            this.getSetupData();
            this.toastHandler('', 'data saved.');
        } else {
            this.toastHandler('error', response.data.message);
            this.getSetupData();
        }
})
    .catch(() => this.toastHandler('error', 'Unable to save Performance Area.'));
},
    updateArea(payload) {
    axios.post('/SmMainSetups/UpdatePerformanceArea/', payload)
    .then(() => {
    this.toastHandler('', 'Performance Area updated.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to update Performance Area.'));
},
    delArea(id) {
    axios.get('/SmMainSetups/DeletePerformanceArea/?id=' + id)
    .then(() => {
    this.toastHandler('', 'Performance Area deleted.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to delete Performance Area.'));
},

    // === CRUD: Performance Skill ===
    saveSkill(payload) {
    delete payload.id;
    axios.post('/SmMainSetups/CreatePerformanceSkill/', payload)
    .then(response => {
        if (response.data.code === 200) {
            this.getSetupData();
            this.toastHandler('', 'data saved.');
        } else {
            this.toastHandler('error', response.data.message);
        }
})
    .catch(() => this.toastHandler('error', 'Unable to save Performance Skill.'));
},
    updateSkill(payload) {
    axios.post('/SmMainSetups/UpdatePerformanceSkill/', payload)
    .then(() => {
    this.toastHandler('', 'Performance Skill updated.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to update Performance Skill.'));
},
    delSkill(id) {
    axios.get('/SmMainSetups/DeletePerformanceSkill/?id=' + id)
    .then(() => {
    this.toastHandler('', 'Performance Skill deleted.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to delete Performance Skill.'));
},

    // === Toasts ===
    toastHandler(type, message = 'An unexpected error occurred.') {
    toastr.options = { closeButton: true, progressBar: true, timeOut: 5000 };
    switch (type) {
    case 'error': toastr.error('', message); break;
    case 'warning': toastr.warning('', message); break;
    default: toastr.success('', message);
}
}
},

    mounted() {
    this.getSetupData();
}
});
app.mount('#app');

