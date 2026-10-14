const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            terminalSubjectList: [],
            terminalSubSubjectList: [],
            terminalSubjectMap: {},
        }
    },

    methods: {
    formatDate(dateInput) {
    return moment(dateInput).format("DD-MMM-YYYY");
    },

    getSetupData() {
    return Promise.all([
    axios.get('/SmMainSetups/ListAllTerminalSubjects/'),
    axios.get('/SmMainSetups/ListAllTerminalSubSubjects/')
    ]).then(([subjects, subSubjects]) => {
    this.terminalSubjectList = subjects.data;
    this.terminalSubSubjectList = subSubjects.data;

    this.terminalSubjectMap = {};
    this.terminalSubjectList.forEach(subject => {
    subject.subSubjects = [];
    subject.terminalSubjectId = subject.id;
    this.terminalSubjectMap[subject.id] = subject.subSubjects.map(sub => {
    sub.terminalSubjectId = subject.id;
    return sub;
});
});

    this.dataTable(this.terminalSubjectList);
}).catch(err => {
    this.toastHandler('error', 'Unable to load terminal subjects.');
});
},

    dataTable(responseData) {
    $("#dataTable").ejGrid({
    dataSource: responseData,
    allowPaging: true,
    allowSorting: true,
    isResponsive: true,
    pageSettings: { pageSize: 20, pageSizeList: [10, 20, 50, 100] },
    scrollSettings: { width: "900px", height: "400px" },
    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
    columns: [
{ field: "id", headerText: "ID", visible: false, isPrimaryKey: true },
{ field: "name", headerText: "Subject Name", validationRules: { required: true }, width: 120 },
{ field: "mark", headerText: "Total Mark", editType: ej.Grid.EditingType.Numeric, width: 80 },
{ field: "tenantId", visible: false }
    ],

    // === Nested Grid for SubSubjects ===
    childGrid: {
    dataSource: this.terminalSubSubjectList,
    queryString: "terminalSubjectId",
    allowPaging: true,
    allowSorting: true,
    pageSettings: { pageSize: 10 },
    scrollSettings: { width: "800px", height: "300px" },
    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
    columns: [
{ field: "id", headerText: "ID", isPrimaryKey: true, visible: false },
{ field: "name", headerText: "Sub-Subject Name", validationRules: { required: true }, width: 120 },
{ field: "mark", headerText: "Mark", editType: ej.Grid.EditingType.Numeric, width: 80 },
{ field: "terminalSubjectId", visible: false },
{ field: "tenantId", visible: false }
    ],

    endAdd: (args) => {
    if (!args.data.terminalSubjectId || args.data.terminalSubjectId === this.emptyGuid) {
    args.data.terminalSubjectId = this.terminalSubjectId;
}
    this.saveSubSubject(args.data);
},

    endEdit: (args) => {
    this.updateSubSubject(args.data);
},

    endDelete: (args) => {
    this.deleteSubSubject(args.data.id);
}
},

    endAdd: (args) => {
    this.saveSubject(args.data);
},

    endEdit: (args) => {
    this.updateSubject(args.data);
},

    endDelete: (args) => {
    this.deleteSubject(args.data.id);
}
});
},

    // === Subject CRUD ===
    saveSubject(payload) {
    delete payload.id;
    delete payload.tenantId;
    axios.post('/SmMainSetups/CreateTerminalSubject/', payload)
    .then(response => {
        if (response.data.code === 200) {
            this.getSetupData();
            this.toastHandler('', 'data saved.');
            this.getSetupData();
        } else {
            this.toastHandler('error', response.data.message);
        }
})
    .catch(() => this.toastHandler('error', 'Unable to save terminal subject.'));
},

    updateSubject(payload) {
    axios.post('/SmMainSetups/UpdateTerminalSubject/', payload)
    .then(() => {
    this.toastHandler('', 'Terminal subject updated.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to update terminal subject.'));
},

    deleteSubject(id) {
    axios.get('/SmMainSetups/DeleteTerminalSubject/?id=' + id)
    .then(() => {
    this.toastHandler('', 'Terminal subject deleted.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to delete terminal subject.'));
},

    // === SubSubject CRUD ===
    saveSubSubject(payload) {
    delete payload.id;
    delete payload.tenantId;
    axios.post('/SmMainSetups/CreateTerminalSubSubject/', payload)
    .then(response => {
        if (response.data.code === 200) {
            this.getSetupData();
            this.toastHandler('', 'data saved.');
        } else {
            this.toastHandler('error', response.data.message);
        }
})
    .catch(() => this.toastHandler('error', 'Unable to save sub-subject.'));
},

    updateSubSubject(payload) {
    axios.post('/SmMainSetups/UpdateTerminalSubSubject/', payload)
    .then(() => {
    this.toastHandler('', 'Sub-subject updated.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to update sub-subject.'));
},

    deleteSubSubject(id) {
    axios.get('/SmMainSetups/DeleteTerminalSubSubject/?id=' + id)
    .then(() => {
    this.toastHandler('', 'Sub-subject deleted.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to delete sub-subject.'));
},

    toastHandler(type, message = 'An unexpected error occurred.') {
    toastr.options = {
    closeButton: true,
    progressBar: true,
    showMethod: 'fadeIn',
    hideMethod: 'fadeOut',
    timeOut: 10000,
};

    switch (type) {
    case 'warning': toastr.warning('', message); break;
    case 'error': toastr.error('', message); break;
    default: toastr.success('', message); break;
}
},
},

    mounted() {
    this.getSetupData();
},
});
app.mount('#app');

