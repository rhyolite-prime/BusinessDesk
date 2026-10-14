const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            schoolGroupList: [],
            positionList: [],
            staffList: [],
            schoolGroupPositionList: [],
            schoolGroupMap: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
        }
    },

    methods: {
    getSetupData() {
    return Promise.all([
    axios.get('/SmMainSetups/ListAllSchoolGroups/'),
    axios.get('/SmMainSetups/ListAllSchoolGroupPositions/'),
   axios.get('/SmStaffSetups/ListAllStaffBios/')
    ])
    .then(([groups, positions, staffs]) => {
    this.schoolGroupList = groups.data;
    this.schoolGroupPositionList = positions.data;
    this.staffList = staffs.data || [];
        
    this.schoolGroupMap = {};
    this.schoolGroupList.forEach(group => {
    group.schoolGroupId = group.id;
    group.positions = this.schoolGroupPositionList.filter(p => p.schoolGroupId === group.id);
    this.schoolGroupMap[group.id] = group.positions;
});

    this.dataTable(this.schoolGroupList);
})
    .catch(err => {
    this.toastHandler('error', 'Unable to load school group setups.');
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
{ field: "name", headerText: "Group Name", validationRules: { required: true }, width: 120 },
{
    field: "staffId",
    headerText: "Staff",
    validationRules: { required: true },
    width: 100,
    editType: ej.Grid.EditingType.Dropdown,
    foreignKeyField: "id",
    foreignKeyValue: "name",
    dataSource: this.staffList
},
{ field: "tenantId", visible: false }
    ],
    childGrid: {
    dataSource: this.schoolGroupPositionList,
    queryString: "schoolGroupId",
    allowPaging: true,
    allowSorting: true,
    isResponsive: true,
    pageSettings: { pageSize: 10 },
    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
    columns: [
{ field: "id", isPrimaryKey: true, visible: false },
{ field: "name", headerText: "Position Name", validationRules: { required: true }, width: 120 },
{ field: "schoolGroupId", visible: false },
{ field: "tenantId", visible: false },
    ],
    endAdd: (args) => {
        if (!args.data.schoolGroupId || args.data.schoolGroupId === this.emptyGuid) {
            args.data.schoolGroupId = this.schoolGroupId;
        }
    this.savePosition(args.data);
},
    endEdit: (args) => {
        if (!args.data.schoolGroupId || args.data.schoolGroupId === this.emptyGuid) {
            args.data.schoolGroupId = this.schoolGroupId;
        }
    this.updatePosition(args.data);
},
    endDelete: (args) => {
    this.delPosition(args.data.id);
}
},
    endAdd: (args) => {
        if (!args.data.staffId || args.data.staffId === this.emptyGuid) {
            args.data.staffId = this.staffId;
        }
        const selected = this.staffList.find(a => a.id === args.data.staffId);
        if (selected) {
            args.data.staffName = selected.name;
        } else {
            args.data.staffName = "unknown";
        }
    this.saveGroup(args.data);
},
    endEdit: (args) => {
        if (!args.data.staffId || args.data.staffId === this.emptyGuid) {
            args.data.staffId = this.staffId;
        }
        const selected = this.staffList.find(a => a.id === args.data.staffId);
        if (selected) {
            args.data.staffName = selected.name;
        } else {
            args.data.staffName = "unknown";
        }
    this.updateGroup(args.data);
},
    endDelete: (args) => {
    this.delGroup(args.data.id);
}
});
},

    // === CRUD: School Groups ===
    saveGroup(payload) {
    delete payload.id;
    axios.post('/SmMainSetups/CreateSchoolGroup/', payload)
    .then(response => {
        if (response.data.code === 200) {
            this.getSetupData();
            this.toastHandler('', 'data saved.');
        } else {
            this.toastHandler('error', response.data.message);
            this.getSetupData();
        }
})
    .catch(() => this.toastHandler('error', 'Unable to save School Group.'));
},
    updateGroup(payload) {
    axios.post('/SmMainSetups/UpdateSchoolGroup/', payload)
    .then(() => {
    this.toastHandler('', 'School Group updated.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to update School Group.'));
},
    delGroup(id) {
    axios.get('/SmMainSetups/DeleteSchoolGroup/?id=' + id)
    .then(() => {
    this.toastHandler('', 'School Group deleted.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to delete School Group.'));
},

    // === CRUD: School Group Positions ===
    savePosition(payload) {
    delete payload.id;
    axios.post('/SmMainSetups/CreateSchoolGroupPosition/', payload)
    .then(response => {
        if (response.data.code === 200) {
            this.getSetupData();
            this.toastHandler('', 'data saved.');
        } else {
            this.toastHandler('error', response.data.message);
        }
})
    .catch(() => this.toastHandler('error', 'Unable to save position.'));
},
    updatePosition(payload) {
    axios.post('/SmMainSetups/UpdateSchoolGroupPosition/', payload)
    .then(() => {
    this.toastHandler('', 'Position updated.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to update position.'));
},
    delPosition(id) {
    axios.get('/SmMainSetups/DeleteSchoolGroupPosition/?id=' + id)
    .then(() => {
    this.toastHandler('', 'Position deleted.');
    this.getSetupData();
})
    .catch(() => this.toastHandler('error', 'Unable to delete position.'));
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