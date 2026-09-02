cmake_minimum_required(VERSION 3.15)
project(FlowFieldTelemetry CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)   # so clangd/VS Code finds raylib.h

option(WITH_DDS "Publish telemetry over eProsima Fast DDS" ON)
set(DDS_DOMAIN_ID "0" CACHE STRING "DDS domain id compiled into the executable")
set(TELEMETRY_HZ "20" CACHE STRING "Telemetry publish rate in Hz")

cmake_host_system_information(RESULT OPERATING_SYSTEM QUERY OS_NAME)

#------------------------------------------------------------------------------
# raylib (same layout as the other projects in this repo)
#------------------------------------------------------------------------------
if (${OPERATING_SYSTEM} STREQUAL "Windows")
    set(RAYLIB_SRC "C:/raylib/raylib/src")
    message(STATUS "ON Windows")
elseif(${OPERATING_SYSTEM} STREQUAL "Linux")
    set(RAYLIB_SRC "$ENV{RAYLIB_PATH}")
    message(STATUS "ON Linux")
endif()

message(STATUS "RAYLIB_SRC=" ${RAYLIB_SRC})

add_library(raylib STATIC IMPORTED)
set_target_properties(raylib PROPERTIES
    IMPORTED_LOCATION "${RAYLIB_SRC}/libraylib.a"
    INTERFACE_INCLUDE_DIRECTORIES "${RAYLIB_SRC}"
)

#------------------------------------------------------------------------------
# Fast DDS (optional)
#
# Two things must be present for the DDS backend: the Fast DDS libraries, and
# fastddsgen to turn idl/FlowTelemetry.idl into type support. If either is
# missing we fall back to telemetry_null.cpp so the simulator still builds.
#
# fastddsgen runs at CONFIGURE time, not build time, on purpose: the 2.x and
# 3.x generators emit different file sets (2.x: *.cxx + *.h; 3.x: *.cxx +
# *.hpp + *.ipp + TypeObjectSupport), so the sources are globbed after
# generation instead of being hardcoded.
#------------------------------------------------------------------------------
set(TELEMETRY_BACKEND "udp")
set(DDS_TARGETS "")
set(GENERATED_SOURCES "")

if (WITH_DDS)
    find_package(fastcdr QUIET)

    find_package(fastdds 3 QUIET)          # Fast DDS 3.x exports target `fastdds`
    if (fastdds_FOUND)
        set(DDS_TARGETS fastdds fastcdr)
        message(STATUS "Found Fast DDS 3.x")
    else()
        find_package(fastrtps 2 QUIET)     # Fast DDS 2.x exports target `fastrtps`
        if (fastrtps_FOUND)
            set(DDS_TARGETS fastrtps fastcdr)
            message(STATUS "Found Fast DDS 2.x (fastrtps)")
        endif()
    endif()

    find_program(FASTDDSGEN NAMES fastddsgen fastddsgen.bat)

    if (DDS_TARGETS AND FASTDDSGEN)
        set(GEN_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated")
        file(MAKE_DIRECTORY "${GEN_DIR}")

        # Re-run CMake when the IDL changes, which re-runs the generator.
        set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
                     "${CMAKE_CURRENT_SOURCE_DIR}/idl/FlowTelemetry.idl")

        message(STATUS "Running ${FASTDDSGEN} on idl/FlowTelemetry.idl")
        execute_process(
            COMMAND "${FASTDDSGEN}" -replace -d "${GEN_DIR}"
                    "${CMAKE_CURRENT_SOURCE_DIR}/idl/FlowTelemetry.idl"
            RESULT_VARIABLE FASTDDSGEN_RESULT
            OUTPUT_VARIABLE FASTDDSGEN_OUTPUT
            ERROR_VARIABLE  FASTDDSGEN_OUTPUT
        )

        file(GLOB GENERATED_SOURCES CONFIGURE_DEPENDS "${GEN_DIR}/*.cxx")

        if (FASTDDSGEN_RESULT EQUAL 0 AND GENERATED_SOURCES)
            set(TELEMETRY_BACKEND "dds")
        else()
            message(WARNING "fastddsgen failed, falling back to the null telemetry "
                            "backend:\n${FASTDDSGEN_OUTPUT}")
        endif()
    elseif(NOT DDS_TARGETS)
        message(WARNING "Fast DDS not found (set CMAKE_PREFIX_PATH to its install "
                        "prefix). Building with the UDP telemetry backend.")
    else()
        message(WARNING "fastddsgen not found on PATH. Building with the UDP "
                        "telemetry backend.")
    endif()
endif()

message(STATUS "Telemetry backend: ${TELEMETRY_BACKEND}")

#------------------------------------------------------------------------------
# Executable
#------------------------------------------------------------------------------
if (TELEMETRY_BACKEND STREQUAL "dds")
    add_executable(${PROJECT_NAME} main.cpp telemetry_dds.cpp ${GENERATED_SOURCES})
    target_include_directories(${PROJECT_NAME} PRIVATE "${GEN_DIR}" "${CMAKE_CURRENT_SOURCE_DIR}")
    target_link_libraries(${PROJECT_NAME} PRIVATE ${DDS_TARGETS})
else()
    add_executable(${PROJECT_NAME} main.cpp telemetry_udp.cpp)
    target_include_directories(${PROJECT_NAME} PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")
    if (${OPERATING_SYSTEM} STREQUAL "Windows")
        target_link_libraries(${PROJECT_NAME} PRIVATE ws2_32)   # winsock, for the UDP sink
    endif()
endif()

target_compile_definitions(${PROJECT_NAME} PRIVATE
    FLOWFIELD_DDS_DOMAIN_ID=${DDS_DOMAIN_ID}u
    FLOWFIELD_TELEMETRY_HZ=${TELEMETRY_HZ})

# Link raylib first, then platform libs (order matters!)
target_link_libraries(${PROJECT_NAME} PRIVATE raylib)

if (${OPERATING_SYSTEM} STREQUAL "Windows")
    target_link_libraries(${PROJECT_NAME} PRIVATE winmm gdi32 opengl32)
elseif(${OPERATING_SYSTEM} STREQUAL "Linux")
    target_link_libraries(${PROJECT_NAME} PRIVATE GL X11 m)
endif()

#------------------------------------------------------------------------------
# Python type support for python/flow_monitor.py
#
#   cmake --build build --target python-bindings
#
# fastddsgen -python emits a SWIG project (its own CMakeLists.txt); this target
# generates it and builds it. Add the resulting directory to PYTHONPATH.
#------------------------------------------------------------------------------
if (FASTDDSGEN)
    set(PY_GEN_DIR "${CMAKE_CURRENT_BINARY_DIR}/python_ts")
    add_custom_target(python-bindings
        COMMAND "${CMAKE_COMMAND}" -E make_directory "${PY_GEN_DIR}"
        COMMAND "${FASTDDSGEN}" -python -replace -d "${PY_GEN_DIR}"
                "${CMAKE_CURRENT_SOURCE_DIR}/idl/FlowTelemetry.idl"
        COMMAND "${CMAKE_COMMAND}" -S "${PY_GEN_DIR}" -B "${PY_GEN_DIR}/build"
                -DCMAKE_BUILD_TYPE=Release
        COMMAND "${CMAKE_COMMAND}" --build "${PY_GEN_DIR}/build" --config Release
        COMMENT "Generating and building Fast DDS Python type support in ${PY_GEN_DIR}"
        VERBATIM
    )
endif()
