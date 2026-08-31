cmake_minimum_required(VERSION 3.15)

project(TimelineVisualization LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(CTest)

option(TIMELINE_BUILD_EXAMPLES "Build the Raylib Timeline examples" ON)

add_executable(timeline_core_tests
    tests/core_tests.cpp
)

add_executable(timeline_storyboard_tests
    tests/storyboard_tests.cpp
)

target_include_directories(timeline_core_tests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
)

target_include_directories(timeline_storyboard_tests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
)

add_test(NAME timeline_core_tests COMMAND timeline_core_tests)
add_test(NAME timeline_storyboard_tests COMMAND timeline_storyboard_tests)

if (TIMELINE_BUILD_EXAMPLES)
    if (NOT RAYLIB_SRC)
        if (WIN32)
            set(_TIMELINE_DEFAULT_RAYLIB_SRC "C:/raylib/raylib/src")
        elseif (UNIX AND DEFINED ENV{RAYLIB_PATH})
            set(_TIMELINE_DEFAULT_RAYLIB_SRC "$ENV{RAYLIB_PATH}")
        else()
            set(_TIMELINE_DEFAULT_RAYLIB_SRC "")
        endif()

        set(
            RAYLIB_SRC
            "${_TIMELINE_DEFAULT_RAYLIB_SRC}"
            CACHE PATH
            "Directory containing raylib.h and libraylib.a"
        )
    endif()

    if (NOT EXISTS "${RAYLIB_SRC}/raylib.h")
        message(FATAL_ERROR
            "Raylib header not found at '${RAYLIB_SRC}/raylib.h'. "
            "Set RAYLIB_SRC or configure with -DTIMELINE_BUILD_EXAMPLES=OFF."
        )
    endif()

    if (NOT EXISTS "${RAYLIB_SRC}/libraylib.a")
        message(FATAL_ERROR
            "Raylib static library not found at '${RAYLIB_SRC}/libraylib.a'. "
            "Set RAYLIB_SRC or configure with -DTIMELINE_BUILD_EXAMPLES=OFF."
        )
    endif()

    add_library(timeline_raylib STATIC IMPORTED GLOBAL)
    set_target_properties(timeline_raylib PROPERTIES
        IMPORTED_LOCATION "${RAYLIB_SRC}/libraylib.a"
        INTERFACE_INCLUDE_DIRECTORIES "${RAYLIB_SRC}"
    )

    function(add_timeline_example target source)
        add_executable(${target} ${source})
        target_include_directories(${target} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
        target_link_libraries(${target} PRIVATE timeline_raylib)

        if (WIN32)
            target_link_libraries(${target} PRIVATE winmm gdi32 opengl32)
        elseif (APPLE)
            target_link_libraries(${target} PRIVATE
                "-framework IOKit"
                "-framework Cocoa"
                "-framework OpenGL"
                "-framework CoreVideo"
            )
        elseif (UNIX)
            find_package(Threads REQUIRED)
            target_link_libraries(${target} PRIVATE GL X11 m Threads::Threads dl rt)
        endif()
    endfunction()

    add_timeline_example(timeline_2d examples/sine_cosine_2d.cpp)
    add_timeline_example(timeline_3d examples/sine_cosine_3d.cpp)
    add_timeline_example(timeline_algorithm examples/algorithm_storyboard.cpp)
    add_timeline_example(timeline_sorting examples/sorting_storyboard.cpp)

    add_executable(timeline_plot_tests tests/plot_tests.cpp)
    target_include_directories(timeline_plot_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
    target_link_libraries(timeline_plot_tests PRIVATE timeline_raylib)
    add_test(NAME timeline_plot_tests COMMAND timeline_plot_tests)
endif()
