"""
Custom exceptions for Mopidy server
"""


class MopidyServerError(Exception):
    """Base exception for Mopidy server errors"""

    pass


class MopidyConfigError(MopidyServerError):
    """Exception raised for configuration errors"""

    pass


class MopidyDependencyError(MopidyServerError):
    """Exception raised when dependencies are missing"""

    pass


class MopidyProcessError(MopidyServerError):
    """Exception raised for process management errors"""

    pass
