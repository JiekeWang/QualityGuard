"""
数据模型
"""
from app.models.user import User
from app.models.project import Project
from app.models.test_case import TestCase, TestType
from app.models.test_case_collection import TestCaseCollection
from app.models.tag import Tag
from app.models.test_plan import TestPlan
from app.models.test_execution import TestExecution, ExecutionStatus
from app.models.device import Device, DeviceType, DeviceStatus
from app.models.interface import Interface, HttpMethod, InterfaceStatus
from app.models.module import Module
from app.models.directory import Directory
from app.models.test_case_version import TestCaseVersion
from app.models.assertion_library import AssertionLibrary
from app.models.data_driver import DataSource, DataTemplate, DataGenerator
from app.models.environment import Environment
from app.models.test_case_review import TestCaseReview, ReviewComment, ReviewStatus
from app.models.test_data_config import TestDataConfig, TestCaseTestDataConfig
from app.models.token_config import TokenConfig
from app.models.page_object import PageObject, PageObjectStatus
from app.models.ui_element import UIElement, LocatorType, ElementType

__all__ = [
    "User",
    "Project",
    "TestCase",
    "TestType",
    "TestCaseCollection",
    "Tag",
    "TestPlan",
    "TestExecution",
    "ExecutionStatus",
    "Device",
    "DeviceType",
    "DeviceStatus",
    "Interface",
    "HttpMethod",
    "InterfaceStatus",
    "Module",
    "Directory",
    "TestCaseVersion",
    "AssertionLibrary",
    "DataSource",
    "DataTemplate",
    "DataGenerator",
    "TestCaseReview",
    "ReviewComment",
    "ReviewStatus",
    "Environment",
    "TestDataConfig",
    "TestCaseTestDataConfig",
    "TokenConfig",
    "PageObject",
    "PageObjectStatus",
    "UIElement",
    "LocatorType",
    "ElementType",
]

