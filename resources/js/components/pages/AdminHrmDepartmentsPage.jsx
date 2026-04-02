import React from 'react';
import AdminHrmNameCrudPage from './AdminHrmNameCrudPage.jsx';

export default function AdminHrmDepartmentsPage(props) {
    return (
        <AdminHrmNameCrudPage
            {...props}
            title="Department Create & Index"
            createLabel="Create Department"
            endpoint="/hrm/departments"
            responseKey="departments"
            nameLabel="Department"
            confirmDeleteLabel="department"
        />
    );
}
